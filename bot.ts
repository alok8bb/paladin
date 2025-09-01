import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { hydrateFiles } from "https://deno.land/x/grammy_files@v1.1.0/mod.ts";
import { Application, Router } from "https://deno.land/x/oak@v16.0.0/mod.ts";
import { editGuardSupply, GuardType, SupportedChains } from "./conversations/guard.ts";
import {
  Api,
  Bot,
  Context,
  session,
  SessionFlavor,
} from "https://deno.land/x/grammy@v1.24.0/mod.ts";
import "https://deno.land/std@0.218.2/dotenv/load.ts";
import { type ParseModeFlavor } from "https://deno.land/x/grammy_parse_mode@1.10.0/mod.ts";
import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from "https://deno.land/x/grammy_conversations@v1.2.0/mod.ts";
import { config } from "./config.ts";
import { connectDB } from "./db.ts";
import { mountGroupHandlers } from "./handlers/group.ts";
import { newGuardConversation } from "./conversations/guard.ts";
import { mountPrivateHandlers } from "./handlers/private.ts";
import {
  standaloneVerificationConversation,
  verificationConversation,
} from "./conversations/verification.ts";
import {
  FileApiFlavor,
  FileFlavor,
} from "https://deno.land/x/grammy_files@v1.1.0/plugin.ts";
import { pollConversation } from "./conversations/poll.ts";
import { GuardModel } from "./models/guard.model.ts";
import { VerifiedTxnModel } from "./models/verifiedTxn.model.ts";
import { checkTokenHoldings } from "./web3/ethers.ts";

interface SessionData {
  chat_id: number;
  poll_data: {
    ca: string;
    type: "ERC20" | "ERC721";
  };
}

export type MyContext = ParseModeFlavor<
  FileFlavor<Context & ConversationFlavor & SessionFlavor<SessionData>>
>;
export type MyConversation = Conversation<MyContext>;

await connectDB(config.databaseUri);

const bot = new Bot<MyContext, FileApiFlavor<Api>>(config.botToken);
await bot.init();
export const BOT_USERNAME = bot.botInfo.username;
bot.api.config.use(hydrateFiles(bot.token));

const app = new Application();
const router = new Router();
app.use(oakCors()); // Enable CORS for All Routes

router.get("/ping", (ctx) => {
  ctx.response.body = { ping: "Pong" };
  ctx.response.status = 200;
});

router.post("/callback", async (ctx) => {
  try {
    if (!ctx.request.hasBody) {
      return;
    }
    const data: {
      data: string;
      chat_id: string;
    } = await ctx.request.body.json();

    const inviteLink = await bot.api.createChatInviteLink(data.chat_id, {
      member_limit: 1,
    });

    ctx.response.status = 200;
    ctx.response.body = {
      inviteLink: inviteLink.invite_link,
    };
  } catch (e) {
    console.error("Callback error:", e);
    ctx.response.status = 400;
    ctx.response.body = {
      error: "something went wrong",
    };
  }
});

function initial(): SessionData {
  return {
    chat_id: 0,
    poll_data: {
      ca: "",
      type: "ERC20",
    },
  };
}
bot.use(session({ initial }));

bot.use(conversations());
bot.use(createConversation(newGuardConversation));
bot.use(createConversation(verificationConversation));
bot.use(createConversation(pollConversation));
bot.use(createConversation(standaloneVerificationConversation));
bot.use(createConversation(editGuardSupply));

if (config.isEnabled) {
  mountGroupHandlers(bot);
  mountPrivateHandlers(bot);
}

console.info(`Bot started on ${config.environment} mode`);
app.use(router.routes());
app.use(router.allowedMethods());

bot.catch((e) => {
  console.error("Bot error:", e);
});

setInterval(async () => {
  const tokenHoldingGuards = await GuardModel.find({
    guardType: GuardType.TokenOnly,
  });

  for (const guard of tokenHoldingGuards) {
    const params = guard.parameters;
    const verifiedTransactions = await VerifiedTxnModel.find({
      chat_id: guard.chat_id,
    });

    verifiedTransactions.forEach(async (element) => {
      const holdsToken = await checkTokenHoldings(
        params.chain.toUpperCase() as SupportedChains,
        element.walletAddress,
        params.tokenAddress ? params.tokenAddress : "",
        params.tokensRequired ? params.tokensRequired : 0
      );
      if (!holdsToken) {
        const member = await bot.api.getChatMember(
          guard.chat_id,
          element.user_id
        );
        if (member.status === "member") {
          try {
            const ban = await bot.api.banChatMember(
              guard.chat_id,
              element.user_id
            );
            // unban the user as well
            await bot.api.unbanChatMember(guard.chat_id, element.user_id);
            if (ban) {
              await bot.api.sendMessage(
                guard.chat_id,
                `User does not hold token, banning user ${element.user_id}`
              );
            }
          } catch (e) {
            console.error("Error banning a user: ", e);
          }
        }
      }
    });

    await bot.api.sendMessage(
      guard.chat_id,
      "Token holders verification complete, next check in 1 hour! ✅"
    );
  }
}, 10000 * 60 * 60);

(async () => {
  await bot.start({
    drop_pending_updates: true,
  });
})();

(async () => {
  console.log("Verification server started on port: 9000")
  await app.listen({ port: 9000 });
})();
