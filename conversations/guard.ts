// Group imports logically
import {
  InlineKeyboard,
  Keyboard,
} from "https://deno.land/x/grammy@v1.24.0/mod.ts";
import { BOT_USERNAME, MyContext, MyConversation } from "../bot.ts";
import {
  bold,
  code,
  fmt,
	FormattedString,
} from "https://deno.land/x/grammy_parse_mode@1.10.0/format.ts";
import { GuardModel } from "../models/guard.model.ts";
import {
  getCustomizePortalText,
  GOVERNANCE_INTRO_STR,
  GuardStrings,
} from "../strings.ts";
import {
  getEditButtonMsgKeyboard,
  getRandomNumber,
  isValidLink,
} from "../strings.ts";
import { editButtonMsg } from "../strings.ts";
import { getFileExtension } from "../utils.ts";
import { InputFile } from "https://deno.land/x/grammy@v1.24.0/types.deno.ts";

// Define enums and types
export enum GuardType {
  NormalVerification = "normal",
  TokenOnly = "token_only",
  PaymentOnly = "payment",
  PaymentAndTokens = "payment_and_token",
  NFTOnly = "nft_only",
  PaymentAndNFT = "payment_and_nft",
  PaymentAndTokenAndNFT = "payment_and_token_and_nft",
}

export enum SupportedChains {
  ETH = "ETH",
  SOL = "SOL",
}

export type Parameters = {
  walletAddress?: string;
  txnAmount?: number;
  tokenAddress?: string;
  tokensRequired?: number;
  nftAddress?: string;
  chain: SupportedChains;
};

export type Guard = {
  guardType: GuardType;
  chat_id: number;
  parameters: Parameters;
  portal_data?: PortalData;
};

const Messages = GuardStrings;
export interface PortalData {
  banner: string;
  text: string;
  buttons: {
    text: string;
    link: string;
    id: number;
  }[];
  governanceParams?: {
    ca: string;
    type: "ERC721" | "ERC20";
  };
  verifiedUsers?: number[];
  trainingData?: string;
}

// Guard type mapping for cleaner detection
const GUARD_TYPE_MAP: Record<string, GuardType> = {
  "normal_kb": GuardType.NormalVerification,
  "token_kb": GuardType.TokenOnly,
  "payment_kb": GuardType.PaymentOnly,
  "token_payment_kb": GuardType.PaymentAndTokens,
  "nft_only_kb": GuardType.NFTOnly,
  "pay_and_nft_kb": GuardType.PaymentAndNFT,
  "pay_token_nft_kb": GuardType.PaymentAndTokenAndNFT,
};

// Guard type configurations for determining what data to collect
const GUARD_CONFIG = {
  needsPayment: (type: GuardType) => 
    type !== GuardType.TokenOnly && type !== GuardType.NFTOnly && type !== GuardType.NormalVerification,
  needsToken: (type: GuardType) => 
    type !== GuardType.PaymentOnly && type !== GuardType.NFTOnly && type !== GuardType.PaymentAndNFT && type !== GuardType.NormalVerification,
  needsNFT: (type: GuardType) => 
    type === GuardType.NFTOnly || type === GuardType.PaymentAndNFT || type === GuardType.PaymentAndTokenAndNFT,
};

// Helper function to create a keyboard
function createKeyboard(buttons: { text: string; callback_data: string }[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  buttons.forEach((button) => {
    keyboard.text(button.text, button.callback_data).row();
  });
  return keyboard;
}

// Helper function to handle chat selection
async function handleChatSelection(
  conversation: MyConversation, 
  ctx: MyContext, 
  message: string,
  isChannel: boolean = false
): Promise<number | null> {
  const kb = new Keyboard()
    .requestChat("📣 Pick a Channel", 0, {
      chat_is_channel: isChannel,
      // @ts-ignore: no idea why linter shows error 
      user_administrator_rights: {
        can_invite_users: true,
        can_manage_chat: true,
        can_post_messages: true,
      },
      // @ts-ignore: no idea why linter shows error 
      bot_administrator_rights: {
        can_invite_users: true,
        can_post_messages: true,
      },
    })
    .oneTime()
    .resized();

  const m = await ctx.reply(message, { reply_markup: kb });
  const cc = await conversation.wait();

  if (!cc.has("msg:chat_shared")) {
    await ctx.api.deleteMessage(m.chat.id, m.message_id);
    await ctx.reply("Invalid response, your request was terminated. Please try again!");
    return null;
  }

  const chat_id = cc.msg!.chat_shared.chat_id;
  await ctx.api.deleteMessage(m.chat.id, m.message_id);
  return chat_id;
}

// Helper function to detect guard type from callback data
function detectGuardType(callbackData: string): GuardType {
  return GUARD_TYPE_MAP[callbackData] || GuardType.NormalVerification;
}

// Helper function to collect payment data
async function collectPaymentData(
  conversation: MyConversation,
  ctx: MyContext,
  guardParams: Guard
): Promise<void> {
  await ctx.reply(Messages.enterEntryAmount.toString(), {
    entities: Messages.enterEntryAmount.entities,
    reply_markup: { force_reply: true },
  });

  const amount = await conversation.form.number();

  await ctx.reply(Messages.enterReceiverWallet.toString(), {
    entities: Messages.enterReceiverWallet.entities,
    reply_markup: { force_reply: true },
  });

  const walletAddress = await conversation.form.text();
  
  guardParams.parameters = {
    ...guardParams.parameters,
    walletAddress: walletAddress,
    txnAmount: amount,
  };
}

// Helper function to collect token data
async function collectTokenData(
  conversation: MyConversation,
  ctx: MyContext,
  guardParams: Guard
): Promise<void> {
  await ctx.reply(Messages.enterTokenAmount.toString(), {
    entities: Messages.enterTokenAmount.entities,
    reply_markup: { force_reply: true },
  });

  const tokenAmount = await conversation.form.number();

  await ctx.reply(Messages.enterTokenAddress.toString(), {
    entities: Messages.enterTokenAddress.entities,
    reply_markup: { force_reply: true },
  });

  const tokenAddress = await conversation.form.text();

  guardParams.parameters = {
    ...guardParams.parameters,
    tokenAddress: tokenAddress,
    tokensRequired: tokenAmount,
  };
}

// Helper function to collect NFT data
async function collectNFTData(
  conversation: MyConversation,
  ctx: MyContext,
  guardParams: Guard
): Promise<void> {
  await ctx.reply(Messages.enterNFTAddress.toString(), {
    entities: Messages.enterNFTAddress.entities,
    reply_markup: { force_reply: true },
  });

  const nftAddress = await conversation.form.text();

  guardParams.parameters = {
    ...guardParams.parameters,
    nftAddress,
  };
}

// Helper function to create protection parameters summary
function createProtectionSummary(guardParams: Guard): FormattedString {
  let fmtStr = fmt`${bold("📋 Paladin Protection Parameters")}
To join group:`;

  const { guardType, parameters } = guardParams;
  const { chain } = parameters;

  if (GUARD_CONFIG.needsPayment(guardType)) {
    fmtStr = fmt`${fmtStr} 

- User must send ${code(parameters.txnAmount!)} ${chain.toUpperCase()} to ${code(parameters.walletAddress!)}.`;
  }

  if (GUARD_CONFIG.needsToken(guardType)) {
    fmtStr = fmt`${fmtStr} 

- User wallet must hold ${code(parameters.tokensRequired!)} Tokens of ${code(parameters.tokenAddress!)} address on ${chain.toUpperCase()} network.`;
  }

  if (GUARD_CONFIG.needsNFT(guardType)) {
    fmtStr = fmt`${fmtStr} 

- User wallet must hold an NFT of ${code(parameters.nftAddress!)} address on ${chain.toUpperCase()} network.`;
  }

  return fmtStr;
}

// Helper function to save guard to database
async function saveGuardToDatabase(
  conversation: MyConversation,
  guardParams: Guard,
  portalData?: PortalData
): Promise<void> {
  await conversation.external(() =>
    GuardModel.create({
      ...guardParams,
      ...(portalData && { portal_data: portalData }),
    })
  );
}

// Helper function to create final portal
async function createFinalPortal(
  ctx: MyContext,
  channel_id: number,
  _guardParams: Guard,
  data: PortalData
): Promise<void> {
  const kb = new InlineKeyboard();
  const counter = 0;

  data.buttons.forEach((button) => {
    if (button.id === 1) return;
    if (counter % 2 === 0) kb.url(button.text, button.link);
    else kb.row();
  });
  
  const verifyButton = data.buttons.find((button) => button.id === 1);
  if (data.buttons.length !== 1) {
    kb.row();
  }
  kb.url(verifyButton!.text, verifyButton!.link);

  await ctx.api.sendPhoto(
    channel_id,
    new InputFile("./data/" + data.banner),
    {
      caption: data.text,
      reply_markup: kb,
    }
  );
}

// Main conversation function
export async function newGuardConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  if (!ctx.chat) {
    return;
  }

  // Step 1: Select channel and group
  const channel_id = await handleChatSelection(
    conversation, 
    ctx, 
    "📢 Please select a channel for creating the portal, showing list of channels where you can add Paladin",
    true
  );
  if (!channel_id) return;

  const group_id = await handleChatSelection(
    conversation, 
    ctx, 
    "🛡️ Pick a group to be protected, showing list of groups where you can add Paladin",
    false
  );
  if (!group_id) return;

  // Step 2: Check for existing guard
  const existingGuard = await conversation.external(() => {
    return GuardModel.findOne({ chat_id: group_id }).lean();
  });
  
  if (existingGuard) {
    if (existingGuard.guardType === GuardType.TokenOnly) {
      const keyboard = new InlineKeyboard().text(
        "🔄 Edit Supply",
        `edit_supply/${existingGuard.chat_id}`
      );
      return ctx.reply(Messages.already_protected.toString(), {
        entities: Messages.already_protected.entities,
        reply_markup: keyboard,
      });
    }

    return ctx.reply(Messages.already_protected.toString(), {
      entities: Messages.already_protected.entities,
      reply_markup: new InlineKeyboard().url(
        "Protected Link",
        `https://t.me/${BOT_USERNAME}?start=${group_id}`
      ),
    });
  }

  // Step 3: Select guard type
  const guardTypeButtons = [
    { text: "🛡️ Simple Authentication", callback_data: "normal_kb" },
    { text: "💳 Token Holdings Only", callback_data: "token_kb" },
    { text: "💰 Pay Only", callback_data: "payment_kb" },
    { text: "💳 Pay & Token Holdings", callback_data: "token_payment_kb" },
    { text: "🎨 NFT Only", callback_data: "nft_only_kb" },
    { text: "💰 NFT Holding & Pay", callback_data: "pay_and_nft_kb" },
    { text: "🎨 NFT & Token Holding And Pay", callback_data: "pay_token_nft_kb" },
  ];

  let msg = await ctx.reply(Messages.guardTypeSelection.toString(), {
    entities: Messages.guardTypeSelection.entities,
    reply_markup: createKeyboard(guardTypeButtons),
  });

  const validCallbacks = Object.keys(GUARD_TYPE_MAP);
  const callbackQueryCtx = await conversation.waitForCallbackQuery(validCallbacks);
  callbackQueryCtx.answerCallbackQuery();
  ctx.api.deleteMessage(msg.chat.id, msg.message_id);

  if (!callbackQueryCtx.hasCallbackQuery(validCallbacks)) {
    return;
  }

  // Step 4: Create guard parameters
  const guardType = detectGuardType(callbackQueryCtx.callbackQuery.data);
  const guardParams: Guard = {
    chat_id: group_id,
    guardType: guardType,
    parameters: {
      chain: "ETH" as SupportedChains,
    },
  };

  // Step 5: Handle normal verification (portal customization)
  if (guardType === GuardType.NormalVerification) {
    const data: PortalData = {
      banner: "default.jpg",
      text: "Verify to join the group!",
      buttons: [
        {
          text: "Click to Verify",
          link: `https://t.me/${BOT_USERNAME}?start=${group_id}`,
          id: 1,
        },
      ],
      governanceParams: undefined,
    };

    // Handle portal customization (keeping existing logic for now)
    // This section remains the same as the original implementation
    const mainFmt = getCustomizePortalText(data.text);
    const mainKeyboard = new InlineKeyboard()
      .text("🖼️ Add Banner", "add_media")
      .text("✏️ Change Text", "change_text")
      .row()
      .text("🤖 Train AI", "train_ai")
      .row()
      .text("🗳️ Advance Features", "governance")
      .row()
      .text("🔘 Edit Buttons", "edit_buttons")
      .row()
      .text("👀 Preview", "preview")
      .text("➡️ Continue", "continue");

    let cFlag = false;
    let msg = await ctx.reply(mainFmt.toString(), {
      reply_markup: mainKeyboard,
      entities: mainFmt.entities,
    });

    while (!cFlag) {
      const open_button_queries = data.buttons
        .filter((button) => button.id !== 1)
        .map((button) => `o/${button.id}`);
      const queries = [
        "add_media",
        "change_text",
        "edit_buttons",
        "continue",
        "train_ai",
        "back",
        "governance",
        "add_button",
        "preview",
      ].concat(open_button_queries);
      const cbqCtx = await conversation.waitForCallbackQuery(queries);

      await cbqCtx.answerCallbackQuery();
      ctx.api.deleteMessage(msg.chat.id, msg.message_id);
      const query = cbqCtx.callbackQuery.data;

      if (query === "change_text") {
        const replyFmt = fmt`${bold("✏️ Change Text")}
Please reply with the text description for the portal, this will be shown on the portal message.`;
        const m = await ctx.reply(replyFmt.toString(), {
          reply_markup: { force_reply: true },
          entities: replyFmt.entities,
        });

        const cText = await conversation.waitFor("message:text");

        ctx.api.deleteMessage(m.chat.id, m.message_id);
        ctx.api.deleteMessage(cText.message.chat.id, cText.message.message_id);

        data.text = cText.message.text;
        const customizePortalFmt = getCustomizePortalText(data.text);
        msg = await ctx.reply(customizePortalFmt.toString(), {
          reply_markup: mainKeyboard,
          entities: customizePortalFmt.entities,
        });
      } else if (query === "edit_buttons") {
        msg = await ctx.reply(editButtonMsg.toString(), {
          reply_markup: getEditButtonMsgKeyboard(data),
          entities: editButtonMsg.entities,
        });
      } else if (query === "continue") {
        cFlag = true;
      } else if (query === "back") {
        msg = await ctx.reply(mainFmt.toString(), {
          reply_markup: mainKeyboard,
          entities: mainFmt.entities,
        });
      } else if (query === "add_button") {
        const fStr = fmt`Please send a new button in this format

${code("Button Text")}
${code("Valid Button Link")}`;
        const m = await ctx.reply(fStr.toString(), {
          entities: fStr.entities,
        });
        const newBtnData = (await conversation.form.text()).split("\n");
        const btnText = newBtnData[0];
        const btnLink = newBtnData[1];

        ctx.api.deleteMessage(m.chat.id, m.message_id);
        if (
          !btnText ||
          !btnLink ||
          btnText.trim() === "" ||
          btnLink.trim() === "" ||
          !isValidLink(btnLink)
        ) {
          await ctx.reply("⚠️ Please try again with valid text and link");
          msg = await ctx.reply(editButtonMsg.toString(), {
            reply_markup: getEditButtonMsgKeyboard(data),
            entities: editButtonMsg.entities,
          });
        }

        if (isValidLink(btnLink)) {
          data.buttons.push({
            id: await getRandomNumber(conversation),
            text: btnText,
            link: btnLink,
          });
          await ctx.reply("✅ Button Added Successfully!");
          msg = await ctx.reply(editButtonMsg.toString(), {
            reply_markup: getEditButtonMsgKeyboard(data),
            entities: editButtonMsg.entities,
          });
        }
      } else if (query === "add_media") {
        const fmtStr = fmt`${bold("🖼️ Add Banner")}
Please send an image to be used as portal banner strictly in the uncompressed format.`;
        const m = await ctx.reply(fmtStr.toString(), {
          entities: fmtStr.entities,
          reply_markup: { force_reply: true },
        });
        const photoContext = await conversation.waitFor(":photo");
        const file = await photoContext.getFile();

        const customizePortalFmt = getCustomizePortalText(data.text);

        if (!file) {
          msg = await ctx.reply(customizePortalFmt.toString(), {
            reply_markup: mainKeyboard,
            entities: customizePortalFmt.entities,
          });
        }
        const fileID = await conversation.external(() => crypto.randomUUID());
        const filePath = `${fileID}.${getFileExtension(
          file.file_path || ".jpg"
        )}`;

        await conversation.external(() => file.download(`./data/${filePath}`));
        data.banner = filePath;

        ctx.api.deleteMessage(m.chat.id, m.message_id);
        ctx.api.deleteMessage(photoContext.chat.id, photoContext.msgId);

        await ctx.reply("✅ Media set successfully!");
        msg = await ctx.reply(customizePortalFmt.toString(), {
          reply_markup: mainKeyboard,
          entities: customizePortalFmt.entities,
        });
      } else if (query === "train_ai") {
        const fmtStr = fmt`${bold("🤖 Train AI")}

You can train AI by sending a description of the token/NFT project that includes all the necessary information in a single paragraph, such as the website, goals, and more.

Please send the training data for the AI:`;
        const m = await ctx.reply(fmtStr.toString(), {
          entities: fmtStr.entities,
          reply_markup: { force_reply: true },
        });

        const textCtx = await conversation.waitFor("message:text");

        ctx.api.deleteMessage(m.chat.id, m.message_id);
        ctx.api.deleteMessage(
          textCtx.message.chat.id,
          textCtx.message.message_id
        );

        data.trainingData = textCtx.message.text;
        await ctx.reply("✅ Training data set successfully!");
        const customizePortalFmt = getCustomizePortalText(data.text);
        msg = await ctx.reply(customizePortalFmt.toString(), {
          reply_markup: mainKeyboard,
          entities: customizePortalFmt.entities,
        });
      } else if (query === "governance") {
        const m = await ctx.reply(GOVERNANCE_INTRO_STR.toString(), {
          reply_markup: new InlineKeyboard()
            .text("ERC20", "ERC20")
            .text("ERC721", "ERC721"),
          entities: GOVERNANCE_INTRO_STR.entities,
        });

        const governanceCtx = await conversation.waitForCallbackQuery([
          "ERC20",
          "ERC721",
        ]);

        ctx.api.editMessageText(
          ctx.chat.id,
          m.message_id,
          "📋 Please send the address of the contract"
        );

        const caCtx = await conversation.waitFor("message:text");

        caCtx.deleteMessage();
        ctx.api.deleteMessage(ctx.chat.id, m.message_id);

        data.governanceParams = {
          ca: caCtx.message.text,
          type: governanceCtx.callbackQuery.data as "ERC20" | "ERC721",
        };

        const str = fmt`✅ Governance set successfully, holders of the ca ${code(
          caCtx.message.text
        )} will be able to participate in the polls of the group!`;
        await ctx.reply(str.toString(), { entities: str.entities });

        const customizePortalFmt = getCustomizePortalText(data.text);
        msg = await ctx.reply(customizePortalFmt.toString(), {
          reply_markup: mainKeyboard,
          entities: customizePortalFmt.entities,
        });
      } else if (query === "preview") {
        const kb = new InlineKeyboard();
        const counter = 0;
        data.buttons.forEach((button) => {
          if (button.id === 1) return;
          if (counter % 2 === 0) kb.url(button.text, button.link);
          else kb.row();
        });
        const verifyButton = data.buttons.find((button) => button.id === 1);
        if (data.buttons.length !== 1) {
          kb.row();
        }
        kb.url(verifyButton!.text, verifyButton!.link);

        await ctx.replyWithPhoto(new InputFile("./data/" + data.banner), {
          caption: data.text,
          reply_markup: kb.row().text("🔙 Back", "back-p"),
        });

        const cbqC = await conversation.waitForCallbackQuery("back-p");
        await cbqC.deleteMessage();

        const customizePortalFmt = getCustomizePortalText(data.text);
        msg = await ctx.reply(customizePortalFmt.toString(), {
          reply_markup: mainKeyboard,
          entities: customizePortalFmt.entities,
        });
      } else if (query.startsWith("o")) {
        const btnId = Number(query.split("/")[1]);
        const button = data.buttons.find((button) => button.id === btnId);

        await ctx.reply(
          `Your button is set with ${button?.text} and links to ${button?.link}`,
          {
            reply_markup: new InlineKeyboard().text(
              "Delete Button",
              `d_${button?.id}`
            ),
          }
        );
      } else if (query.startsWith("d")) {
        const btnId = Number(query.split("_")[1]);
        const buttonIndex = data.buttons.findIndex(
          (button) => button.id === btnId
        );

        if (buttonIndex !== -1) {
          data.buttons.splice(buttonIndex, 1);
        }

        msg = await ctx.reply(editButtonMsg.toString(), {
          reply_markup: getEditButtonMsgKeyboard(data),
          entities: editButtonMsg.entities,
        });
      }
    }

    await saveGuardToDatabase(conversation, guardParams, data);
    await createFinalPortal(ctx, channel_id, guardParams, data);

    return ctx.reply("🛡️ This group's protection is active", {
      reply_markup: new InlineKeyboard().url(
        "Auth Link",
        `https://t.me/${BOT_USERNAME}?start=${guardParams.chat_id}`
      ),
    });
  }

  // Step 6: Select blockchain network
  msg = await ctx.reply(Messages.selectNetwork.toString(), {
    entities: Messages.selectNetwork.entities,
    reply_markup: new InlineKeyboard()
      .text(SupportedChains.ETH, SupportedChains.ETH.toLowerCase())
      .row()
      .text(SupportedChains.SOL, SupportedChains.SOL.toLowerCase()),
  });

  const chainCtx = await conversation.waitForCallbackQuery(
    Object.values(SupportedChains).map((value) => value.toLowerCase())
  );
  chainCtx.answerCallbackQuery();

  const chain = chainCtx.callbackQuery.data.toUpperCase() as SupportedChains;
  guardParams.parameters.chain = chain;
  await ctx.api.deleteMessage(ctx.chat.id, msg.message_id);

  // Step 7: Collect required data based on guard type
  if (GUARD_CONFIG.needsPayment(guardType)) {
    await collectPaymentData(conversation, ctx, guardParams);
  }

  if (GUARD_CONFIG.needsToken(guardType)) {
    await collectTokenData(conversation, ctx, guardParams);
  }

  if (GUARD_CONFIG.needsNFT(guardType)) {
    await collectNFTData(conversation, ctx, guardParams);
  }

  // Step 8: Show summary and confirm
  const summaryFormat = createProtectionSummary(guardParams);

  msg = await ctx.reply(summaryFormat.toString(), {
    entities: summaryFormat.entities,
    reply_markup: new InlineKeyboard()
      .text("Cancel", "cancel_guard")
      .text("Save", "save_guard"),
  });

  const confirmationCtx = await conversation.waitForCallbackQuery([
    "cancel_guard",
    "save_guard",
  ]);

  await ctx.api.deleteMessage(ctx.chat.id, msg.message_id);
  
  if (confirmationCtx.callbackQuery.data === "save_guard") {
    await saveGuardToDatabase(conversation, guardParams);
    
    ctx.reply("🛡️ This group's protection is active", {
      reply_markup: new InlineKeyboard().url(
        "Auth Link",
        `https://t.me/${BOT_USERNAME}?start=${guardParams.chat_id}`
      ),
    });

    await ctx.api.sendPhoto(channel_id, new InputFile("./data/default.jpg"), {
      caption: "Please verify to join the group",
      reply_markup: new InlineKeyboard().url(
        "Click to Verify",
        `https://t.me/${BOT_USERNAME}?start=${guardParams.chat_id}`
      ),
    });
  } else {
    ctx.reply("Cancelled request... To create new request please do /new");
  }
}

// Function to edit guard supply
export async function editGuardSupply(
  conversation: MyConversation,
  ctx: MyContext
) {
  if (!ctx.from) return;
  if (!ctx.hasCallbackQuery) return;

  const data = ctx.callbackQuery!.data;
  if (!data!.startsWith("edit_supply")) return;

  const chat_id = data!.split("/")[1];
  const guard = await GuardModel.findOne({ chat_id });

  if (!guard) return;
  if (guard.guardType !== GuardType.TokenOnly) return;
  
  await ctx.reply("Enter new supply");
  const newSupply = await conversation.form.number();
  guard.parameters.tokensRequired = newSupply;
  await guard.save();

  await ctx.reply("Tokens required updated successfully!");
}