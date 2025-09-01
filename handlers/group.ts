import { Bot } from "https://deno.land/x/grammy@v1.24.0/bot.ts";
import moment from "npm:moment";
import { BOT_USERNAME, MyContext } from "../bot.ts";
import { getTopUsers, GuardModel, intervals } from "../models/guard.model.ts";
import { GuardType } from "../conversations/guard.ts";
import { PollModel } from "../models/poll.model.ts";
import { getPairDataString, getPollMessage } from "../strings.ts";
import { getAnswer } from "../chatgpt.ts";
import {
  bold,
  code,
  fmt,
  italic,
  link,
} from "https://deno.land/x/grammy_parse_mode@1.10.0/format.ts";
import {
  InlineKeyboard,
  InputFile,
  InputMediaBuilder,
} from "https://deno.land/x/grammy@v1.24.0/mod.ts";
import { getTokenInformation } from "../utils.ts";
import { config } from "../config.ts";

export const mountGroupHandlers = (bot: Bot<MyContext>) => {
  bot.chatType(["group", "supergroup"]).command("new", async (ctx) => {
    await ctx.conversation.exit("newGuardConversation");
    await ctx.conversation.enter("newGuardConversation");
  });

  bot.chatType(["group", "supergroup"]).command("verify", async (ctx) => {
    const chat_id = ctx.chat.id;
    const guard = await GuardModel.findOne({ chat_id: chat_id }).lean();

    if (
      !guard ||
      guard.guardType !== GuardType.NormalVerification ||
      !guard.portal_data ||
      !('governanceParams' in guard.portal_data) ||
      !guard.portal_data.governanceParams?.ca
    ) {
      return ctx.reply("⚠️ The group is not set up for guard or governance!");
    }

    const fmtStr = fmt`${bold("📝 Verification Instructions")}

To participate in the governance of the project, you need to verify your holdings of ${code(
      guard.portal_data.governanceParams.ca
    )} tokens/NFT. 
To do this, please follow the instructions by clicking the verify button below 
`;
    return await ctx.reply(fmtStr.toString(), {
      entities: fmtStr.entities,
      reply_markup: new InlineKeyboard().url(
        "Verify",
        `https://t.me/${BOT_USERNAME}?start=verify-${chat_id}`
      ),
    });
  });

  bot
    .chatType(["group", "supergroup"])
    .callbackQuery(/^(\d+[dhm]|ref)-0x[a-zA-Z0-9]+$/, async (ctx) => {
      let [timeframe, ca] = ctx.callbackQuery.data.split("-");
      if (timeframe === "ref") {
        timeframe = "1d";
      }

      if (!ctx.callbackQuery.message) {
        return;
      }
      const pair = await getTokenInformation(ca);
      const { pairAddress } = pair;
      const url = `${config.chartApiUrl}/chart/${pairAddress}?interval=${timeframe}`;
      const caption = getPairDataString(pair, ca);

      await ctx.editMessageMedia(
        InputMediaBuilder.photo(new InputFile({ url }), {
          caption: caption.toString(),
          caption_entities: caption.entities,
        }),
        {
          reply_markup: new InlineKeyboard()
            .text("1m", `1m-${ca}`)
            .text("5m", `5m-${ca}`)
            .text("🔄", `ref-${ca}`)
            .text("1h", `1h-${ca}`)
            .text("1d", `1d-${ca}`)
            .row()
            .text(
              `Updated: ${moment().utc().format("MMMM Do YYYY, hh:mm:ss")} UTC`,
              " "
            ),
        }
      );

      await ctx.answerCallbackQuery();
    });

  bot.chatType(["group", "supergroup"]).command("analytics", (ctx) => {
    const fmtStr = fmt`${bold("📊 Analytics Commands")}

1. /t_analytics - Get token analytics
2. /m_analytics - Get message stats 
3. /u_analytics - Get user message stats`;
    ctx.reply(fmtStr.toString(), {
      entities: fmtStr.entities,
    });
  });

  /*
        Token Analytics Handler
    */
  bot.chatType(["group", "supergroup"]).command("t_analytics", async (ctx) => {
    const chat_id = ctx.chat.id;
    const guard = await GuardModel.findOne({ chat_id }).lean();
    if (!guard) {
      return;
    }

    if (
      guard.guardType !== GuardType.NormalVerification ||
      !guard.portal_data ||
      !('governanceParams' in guard.portal_data) ||
      !guard.portal_data.governanceParams
    ) {
      return;
    }

    if (
      !guard.portal_data.governanceParams ||
      !guard.portal_data.governanceParams.ca
    ) {
      return ctx.reply("⚠️ The group wasn't set up with a token/NFT ca!");
    }

    if (guard.portal_data.governanceParams.type === "ERC721") {
      return ctx.reply(
        "⚠️ Analytics currently not available for ERC721 projects!"
      );
    }

    const { ca } = guard.portal_data.governanceParams;
    const gettingMsg = await ctx.reply("🔄 Fetching token information...");
    try {
      const pair = await getTokenInformation(ca);

      const { pairAddress } = pair;

      const url = `${config.chartApiUrl}/chart/${pairAddress}?interval=1d`;
      ctx.api.deleteMessage(gettingMsg.chat.id, gettingMsg.message_id);
      const caption = getPairDataString(pair, ca);
      await ctx.replyWithPhoto(new InputFile({ url }), {
        caption: caption.toString(),
        caption_entities: caption.entities,
        reply_markup: new InlineKeyboard()
          .text("1m", `1m-${ca}`)
          .text("5m", `5m-${ca}`)
          .text("🔄", `ref-${ca}`)
          .text("1h", `1h-${ca}`)
          .text("1d", `1d-${ca}`)
          .row()
          .text(
            `Updated: ${moment().utc().format("MMMM Do YYYY, hh:mm:ss")} UTC`,
            " "
          ),
      });
    } catch (e) {
      console.error("Error fetching token information:", e);
      await ctx.api.deleteMessage(gettingMsg.chat.id, gettingMsg.message_id);
      const msgFmt = fmt`${italic(
        `Failed to fetch the token information for ${code(
          ca
        )}, please try again later`
      )}`;
      return ctx.reply(msgFmt.toString(), {
        entities: msgFmt.entities,
      });
    }
  });

  bot.chatType(["supergroup", "group"]).command("u_analytics", async (ctx) => {
    const guard = await GuardModel.findOne({ chat_id: ctx.chat.id }).lean();

    if (!guard) {
      return ctx.reply("No analytics available for this group.");
    }

    let fmtStr = fmt`${bold("User Analytics")}
`;

    getTopUsers(guard.userAnalytics).forEach((user) => {
      fmtStr = fmt`${fmtStr}${link(
        user.name,
        `tg://user?id=${user.user_id}`
      )} - ${user.messageCount} messages\n`;
    });
    await ctx.reply(fmtStr.toString(), {
      entities: fmtStr.entities,
    });
  });

  bot.chatType(["group", "supergroup"]).command("m_analytics", async (ctx) => {
    const chat_id = ctx.chat.id;
    const guard = await GuardModel.findOne({ chat_id }).lean();
    if (!guard) {
      return;
    }

    const messageAnalytics = guard.messageAnalytics;
    const gettingMsg = await ctx.reply("🔄 Fetching message stats...");
    const response = await fetch(`${config.chartApiUrl}/hourly/chart`, {
      body: JSON.stringify(messageAnalytics.timeIntervals),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    ctx.api.deleteMessage(gettingMsg.chat.id, gettingMsg.message_id);
    const res: {
      id: string;
    } = await response.json();
    await ctx.replyWithPhoto(
      new InputFile({ url: `${config.chartApiUrl}/image/${res.id}` }),
      {
        caption: "📊 Message Statistics",
      }
    );
  });

  /*
        Ask Handler
    */
  bot.chatType(["group", "supergroup"]).command("ask", async (ctx) => {
    const chat_id = ctx.chat.id;
    const guard = await GuardModel.findOne({ chat_id }).lean();
    if (
      !guard ||
      guard.guardType !== GuardType.NormalVerification ||
      !guard.portal_data ||
      !guard.portal_data.trainingData ||
      guard.portal_data.governanceParams?.type === "ERC721"
    ) {
      return ctx.reply("⚠️ The group is not set up for AI!");
    }

    const m = await ctx.reply("💭");
    const answer = await getAnswer(
      guard.portal_data.trainingData,
      ctx.message.text,
      guard.portal_data.governanceParams!.ca
    );
    await ctx.api.deleteMessage(chat_id, m.message_id);
    if (!answer) {
      return ctx.reply(
        "I'm sorry, I couldn't answer that. Please contact Paladin admins."
      );
    }

    return ctx.reply(answer);
  });

  /*
        New Poll Handler
    */
  bot.chatType(["supergroup", "group"]).command("new_poll", async (ctx) => {
    const chat_id = ctx.chat.id;
    const member = await ctx.api.getChatMember(chat_id, ctx.from.id);
    if (member.status !== "creator" && member.status !== "administrator") {
      return ctx.reply("⚠️ Only group owners or admins can create a poll!");
    }

    const guardedGroup = await GuardModel.findOne({ chat_id }).lean();

    if (
      !guardedGroup ||
      guardedGroup.guardType !== GuardType.NormalVerification
    ) {
      return;
    }

    if (
      !guardedGroup ||
      !guardedGroup.portal_data ||
      !guardedGroup.portal_data.governanceParams
    ) {
      return ctx.reply(
        "⚠️ The group wasn't set up with governance parameters!"
      );
    }

    ctx.session.poll_data = {
      ca: guardedGroup.portal_data.governanceParams.ca,
      type: guardedGroup.portal_data.governanceParams.type,
    };

    await ctx.conversation.enter("pollConversation");
  });

  bot
    .chatType(["group", "supergroup"])
    .callbackQuery(/^vote:\d+:\d+$/, async (ctx) => {
      const parts = ctx.callbackQuery.data.split(":");
      const poll_id = parts[1];
      const option_id = parts[2];

      const guard = await GuardModel.findOne({ chat_id: ctx.chat.id }).lean();

      if (!guard?.portal_data?.verifiedUsers?.includes(ctx.from.id)) {
        return ctx.answerCallbackQuery(
          "You need to verify your holdings to vote!"
        );
      }

      const poll = await PollModel.findOne({ id: poll_id }).lean();
      if (!poll) return ctx.answerCallbackQuery("Poll does not exist!");

      if (poll.voters.includes(ctx.from.id)) {
        return ctx.answerCallbackQuery("You have already voted in this poll");
      }

      const option = poll.options.find((o) => o.id.toString() == option_id);
      if (option) {
        option.votes++;
      }
      poll.voters.push(ctx.from.id);
      await PollModel.updateOne({ id: poll_id }, poll);

      const { pollStr, kb } = getPollMessage(
        poll.options,
        poll.question,
        poll.id.toString()
      );

      await ctx.api.editMessageText(
        poll.chat_id,
        poll.message_id,
        pollStr.toString(),
        {
          entities: pollStr.entities,
          reply_markup: kb,
        }
      );
    });

  /*
        Message Analytics Hanlder
    */
  bot.chatType(["supergroup", "group"]).on("message", async (ctx) => {
    const chat_id = ctx.chat.id;
    const { id: user_id, username } = ctx.message.from;
    const fullName = (({ first_name, last_name }) =>
      `${first_name} ${last_name ?? ""}`)(ctx.message.from);

    const guard = await GuardModel.findOne({ chat_id }).lean();
    if (!guard) {
      return;
    }

    const now = new Date();
    // const dateStr = `${now.getUTCMonth() + 1}-${now.getUTCDate()}-${
    // 	now.getUTCFullYear().toString().slice(-2)
    // }`;
    const hour = now.getUTCHours();
    const nextHour = (hour + 1) % 24;
    const interval = `${hour}-${nextHour}`;

    try {
      const msgDoc = guard.messageAnalytics;

      if (msgDoc.timeIntervals) {
        msgDoc.timeIntervals[interval as keyof intervals]++;
      }

      const user = guard.userAnalytics.find((user) => user.user_id === user_id);
      if (!user) {
        guard.userAnalytics.push({
          messageCount: 1,
          name: fullName,
          user_id,
          username,
        });
      } else {
        user.messageCount++;
      }
    } catch (e) {
      // Error handling for user analytics
      console.error("Error handling user analytics:", e);
    }

    await GuardModel.updateOne({ _id: guard._id }, guard);
  });
};
