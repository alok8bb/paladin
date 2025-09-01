import {
  bold,
  code,
  fmt,
} from "https://deno.land/x/grammy_parse_mode@1.10.0/format.ts";
import { MyContext, MyConversation } from "../bot.ts";
import { InlineKeyboard } from "https://deno.land/x/grammy@v1.24.0/mod.ts";
import { PollModel } from "../models/poll.model.ts";
import { generateRandomSixDigitNumber } from "../utils.ts";
import { getPollMessage } from "../strings.ts";

export async function pollConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  if (ctx.from === undefined) return false;
  if (ctx.chat === undefined) return false;
  const { ca, type } = conversation.session.poll_data;

  const fmtStr = fmt`${bold("Create Poll")}
To create a new poll, please provide the question and the options in the following format:
${code(`
Question
- Option 1
- Option 2
- Option 3
`)}
(you may also copy and paste the format for ease)
`;
  await ctx.reply(fmtStr.toString(), {
    entities: fmtStr.entities,
  });
  const { message } = await conversation.waitFrom(ctx.from);
  if (!message || !message.text) return ctx.reply("Invalid format!");
  const regex =
    /^(.*)(?:\n- (.+))(?:\n- (.+))(?:\n- (.+))?(?:\n- (.+))?(?:\n- (.+))?$/gm;

  // Executing the regex on the text
  const match = regex.exec(message.text);

  // If the text doesn't match the pattern, return an error message
  if (!match) {
    return ctx.reply("⚠️ Invalid question format");
  }

  // Extracting question and options
  const question = match[1];
  const options = match.slice(2).filter((option) => !!option);

  // If more than 5 options, return an error message
  if (options.length > 5) {
    return ctx.reply("⚠️ Poll can have max 5 options");
  }

  const kb = new InlineKeyboard();
  options.forEach((option) => {
    kb.text(option).row();
  });
  kb.text("️🗑️ Discard", "discard");
  kb.text("➡️ Continue", "continue");

  const fmtS = fmt`${bold("🔮 Poll Preview")}

${bold(question)}`;
  const msg = await ctx.reply(fmtS.toString(), {
    reply_markup: kb,
    entities: fmtS.entities,
  });

  const cbkCtx = await conversation.waitForCallbackQuery([
    "discard",
    "continue",
  ]);
  cbkCtx.answerCallbackQuery();
  const query = cbkCtx.callbackQuery.data;
  if (query === "discard") {
    await ctx.api.deleteMessage(msg.chat.id, msg.message_id);
    return;
  }

  if (query === "continue") {
    const id = generateRandomSixDigitNumber();
    const o = options.map((option, index) => ({
      text: option,
      votes: 0,
      id: index,
    }));

    const { pollStr, kb } = getPollMessage(o, question, id.toString());

    const pollMsg = await ctx.reply(pollStr.toString(), {
      entities: pollStr.entities,
      reply_markup: kb,
    });

    await conversation.external(() =>
      PollModel.create({
        id: id,
        chat_id: pollMsg.chat.id,
        message_id: pollMsg.message_id,
        options: o,
        question: question,
        ca: ca,
        type: type,
        voters: [],
      })
    );
  }
}
