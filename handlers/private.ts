import { Bot } from "https://deno.land/x/grammy@v1.24.0/bot.ts";
import { InputFile } from "https://deno.land/x/grammy@v1.24.0/types.deno.ts";
import { MyContext } from "../bot.ts";
import { GuardModel } from "../models/guard.model.ts";
import { GuardType } from "../conversations/guard.ts";
import { START_TEXT } from "../strings.ts";

export const mountPrivateHandlers = (bot: Bot<MyContext>) => {
  bot.chatType(["private"]).command("start", async (ctx) => {
    const chatID = ctx.match;
    if (chatID.startsWith("verify-")) {
      const chat_id = chatID.replace("verify-", "");
      const guard = await GuardModel.findOne({ chat_id: chat_id }).lean();
      if (
        !guard ||
        guard.guardType !== GuardType.NormalVerification ||
        !guard.portal_data ||
        'governanceParams' in guard.portal_data === false ||
        !guard.portal_data.governanceParams
      ) {
        return ctx.reply("⚠️ Invalid verification request!");
      }

      const { ca, type } = guard.portal_data.governanceParams;
      ctx.session.chat_id = Number(chat_id);
      ctx.session.poll_data = {
        ca,
        type,
      };
      
      await ctx.conversation.enter("standaloneVerificationConversation");
      return;
    }

    if (!chatID) {
      return ctx.replyWithPhoto(new InputFile("./images/start_banner.jpg"), {
        caption: START_TEXT.toString(),
        caption_entities: START_TEXT.entities,
      });
    }

    ctx.session.chat_id = Number(chatID);
    await ctx.conversation.enter("verificationConversation");
  });

  bot.chatType("private").command("new", async (ctx) => {
    await ctx.conversation.exit("newGuardConversation");
    await ctx.conversation.enter("newGuardConversation");
  });

  bot.on("callback_query:data", async (ctx) => {
    await ctx.conversation.enter("editGuardSupply");
  });
};
