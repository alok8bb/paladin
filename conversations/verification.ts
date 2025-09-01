import { MyContext, MyConversation } from "../bot.ts";
import {
  check0eTxn,
  checkNFTHoldings,
  checkTokenHoldings,
  checkTransaction,
} from "../web3/ethers.ts";
import { GuardType, SupportedChains } from "./guard.ts";
import { VerifiedTxnModel } from "../models/verifiedTxn.model.ts";
import { GuardModel } from "../models/guard.model.ts";
import { InvalidTxnError } from "../web3/ethers.ts";
import {
  chatLinkMessage,
  couldntGenerateLinkMsg,
  getDoesNotHoldNFTMsg,
  getDoesNotHoldTokenMsg,
  nftAndPayMessage,
  nftOnlyMessage,
  nftTokenAndPayMessage,

  payMessage,
  standaloneVerificationMessage,
  tokenAndPayMessage,
  tokenOnlyMessage,
  VERIFICATION_ERR_NFT_MSG,
  VERIFICATION_ERR_TOKEN_MSG,
} from "../strings.ts";
import { InlineKeyboard } from "https://deno.land/x/grammy@v1.24.0/mod.ts";
import { InputFile } from "https://deno.land/x/grammy@v1.24.0/types.deno.ts";
import { config } from "../config.ts";

export async function verificationConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  if (!ctx.from) {
    return;
  }

  const user_id = ctx.from.id;
  const chat_id = conversation.session.chat_id;
  const guard = await GuardModel.findOne({
    chat_id,
  }).lean();

  if (!guard) {
    return ctx.reply("💢 Group not found in guarded groups!");
  }

  const params = guard.parameters;
  if (guard.guardType === GuardType.TokenOnly) {
    const fmtStr = tokenOnlyMessage(params);
    await ctx.reply(fmtStr.toString(), {
      entities: fmtStr.entities,
      reply_markup: {
        force_reply: true,
      },
    });

    const { message } = await conversation.waitFor("msg:text");
    if (!message) return;
    const txnHash = message.text;
    try {
      const address = await conversation.external(() =>
        check0eTxn(txnHash, params.chain.toUpperCase() as SupportedChains)
      );

      const existingVerifiedTxn = await VerifiedTxnModel.findOne({
        walletAddress: address,
      });

      if (existingVerifiedTxn) {
        return ctx.reply(
          "This wallet has already been verified, and link was generated!"
        );
      }

      const holdsToken = await conversation.external(() =>
        checkTokenHoldings(
          params.chain.toUpperCase() as SupportedChains,
          address,
          params.tokenAddress!,
          params.tokensRequired!
        )
      );
      if (holdsToken) {
        await conversation.external(() =>
          VerifiedTxnModel.create({
            chat_id: guard.chat_id,
            user_id,
            walletAddress: address.toString(),
            txnHash,
            guardType: guard.guardType,
          })
        );

        try {
          const inviteLink = await ctx.api.createChatInviteLink(guard.chat_id, {
            member_limit: 1,
          });
          const fmtStr = chatLinkMessage(inviteLink.invite_link);
          // VERIFIED
          return await ctx.replyWithPhoto(
            new InputFile("./images/verified.jpg"),
            {
              caption: fmtStr.toString(),
              caption_entities: fmtStr.entities,
            }
          );
        } catch (e) {
          conversation.log(e);
          return await ctx.reply(couldntGenerateLinkMsg.toString(), {
            entities: couldntGenerateLinkMsg.entities,
          });
        }
      }

      const fmtString = getDoesNotHoldTokenMsg(
        params.tokensRequired!,
        params.tokenAddress!
      );

      return ctx.reply(fmtString.toString(), { entities: fmtString.entities });
    } catch (e) {
      conversation.log(e);
      if (e instanceof InvalidTxnError) {
        return ctx.reply(e.message);
      }
      await ctx.reply(VERIFICATION_ERR_TOKEN_MSG);
    }
  } else if (guard.guardType === GuardType.PaymentOnly) {
    const fmtStr = payMessage(params);
    await ctx.reply(fmtStr.toString(), {
      entities: fmtStr.entities,
      reply_markup: {
        force_reply: true,
      },
    });

    const { message } = await conversation.waitFor("msg:text");
    if (!message) return;
    const txnHash = message.text;

    try {
      const address = await conversation.external(() =>
        checkTransaction(
          txnHash,
          params.chain.toUpperCase() as SupportedChains,
          params.walletAddress!,
          params.txnAmount!
        )
      );
      await conversation.external(() =>
        VerifiedTxnModel.create({
          chat_id: guard.chat_id,
          user_id,
          walletAddress: address.toString(),
          txnHash,
          guardType: guard.guardType,
        })
      );

      try {
        const inviteLink = await ctx.api.createChatInviteLink(guard.chat_id, {
          member_limit: 1,
        });
        const fmtStr = chatLinkMessage(inviteLink.invite_link);
        // VERIFIED
        return await ctx.replyWithPhoto(
          new InputFile("./images/verified.jpg"),
          {
            caption: fmtStr.toString(),
            caption_entities: fmtStr.entities,
          }
        );
      } catch (e) {
        conversation.log(e);
        return await ctx.reply(couldntGenerateLinkMsg.toString(), {
          entities: couldntGenerateLinkMsg.entities,
        });
      }
    } catch (e) {
      conversation.log(e);
      if (e instanceof InvalidTxnError) {
        return ctx.reply(e.message);
      }
      await ctx.reply(VERIFICATION_ERR_TOKEN_MSG);
    }
  } else if (guard.guardType === GuardType.PaymentAndTokens) {
    const fmtStr = tokenAndPayMessage(params);
    await ctx.reply(fmtStr.toString(), {
      entities: fmtStr.entities,
      reply_markup: {
        force_reply: true,
      },
    });

    const { message } = await conversation.waitFor("msg:text");
    if (!message) return;
    const txnHash = message.text;

    try {
      const address = await conversation.external(() =>
        checkTransaction(
          txnHash,
          params.chain.toUpperCase() as SupportedChains,
          params.walletAddress!,
          params.txnAmount!
        )
      );

      const holdsToken = await conversation.external(() =>
        checkTokenHoldings(
          params.chain.toUpperCase() as SupportedChains,
          address,
          params.tokenAddress!,
          params.tokensRequired!
        )
      );
      if (holdsToken) {
        await conversation.external(() =>
          VerifiedTxnModel.create({
            chat_id: guard.chat_id,
            user_id,
            walletAddress: address.toString(),
            txnHash,
            guardType: guard.guardType,
          })
        );

        try {
          const inviteLink = await ctx.api.createChatInviteLink(guard.chat_id, {
            member_limit: 1,
          });
          const fmtStr = chatLinkMessage(inviteLink.invite_link);
          // VERIFIED
          return await ctx.replyWithPhoto(
            new InputFile("./images/verified.jpg"),
            {
              caption: fmtStr.toString(),
              caption_entities: fmtStr.entities,
            }
          );
        } catch (e) {
          conversation.log(e);
          return await ctx.reply(couldntGenerateLinkMsg.toString(), {
            entities: couldntGenerateLinkMsg.entities,
          });
        }
      }

      const fmtString = getDoesNotHoldTokenMsg(
        params.tokensRequired!,
        params.tokenAddress!
      );

      return ctx.reply(fmtString.toString(), { entities: fmtString.entities });
    } catch (e) {
      conversation.log(e);
      if (e instanceof InvalidTxnError) {
        return ctx.reply(e.message);
      }
      await ctx.reply(VERIFICATION_ERR_TOKEN_MSG);
    }
  } else if (guard.guardType === GuardType.NFTOnly) {
    const fmtStr = nftOnlyMessage(params);
    await ctx.reply(fmtStr.toString(), {
      entities: fmtStr.entities,
      reply_markup: {
        force_reply: true,
      },
    });

    const { message } = await conversation.waitFor("msg:text");
    if (!message) return;
    const txnHash = message.text;
    try {
      const address = await conversation.external(() =>
        check0eTxn(txnHash, params.chain.toUpperCase() as SupportedChains)
      );

      const holdsNFT = await conversation.external(() =>
        checkNFTHoldings(
          params.chain.toUpperCase() as SupportedChains,
          address,
          params.nftAddress!
        )
      );
      if (holdsNFT) {
        await conversation.external(() =>
          VerifiedTxnModel.create({
            chat_id: guard.chat_id,
            user_id,
            walletAddress: address.toString(),
            txnHash,
            guardType: guard.guardType,
          })
        );

        try {
          const inviteLink = await ctx.api.createChatInviteLink(guard.chat_id, {
            member_limit: 1,
          });
          const fmtStr = chatLinkMessage(inviteLink.invite_link);
          // VERIFIED
          return await ctx.replyWithPhoto(
            new InputFile("./images/verified.jpg"),
            {
              caption: fmtStr.toString(),
              caption_entities: fmtStr.entities,
            }
          );
        } catch (e) {
          conversation.log(e);
          return await ctx.reply(couldntGenerateLinkMsg.toString(), {
            entities: couldntGenerateLinkMsg.entities,
          });
        }
      }

      const fmtString = getDoesNotHoldNFTMsg(params.nftAddress!);

      return ctx.reply(fmtString.toString(), { entities: fmtString.entities });
    } catch (e) {
      conversation.log(e);
      if (e instanceof InvalidTxnError) {
        return ctx.reply(e.message);
      }
      await ctx.reply(VERIFICATION_ERR_NFT_MSG);
    }
  } else if (guard.guardType === GuardType.PaymentAndNFT) {
    const fmtStr = nftAndPayMessage(params);
    await ctx.reply(fmtStr.toString(), {
      entities: fmtStr.entities,
      reply_markup: {
        force_reply: true,
      },
    });

    const { message } = await conversation.waitFor("msg:text");
    if (!message) return;
    const txnHash = message.text;

    try {
      const address = await conversation.external(() =>
        checkTransaction(
          txnHash,
          params.chain.toUpperCase() as SupportedChains,
          params.walletAddress!,
          params.txnAmount!
        )
      );

      const holdsNFT = await conversation.external(() =>
        checkNFTHoldings(
          params.chain.toUpperCase() as SupportedChains,
          address,
          params.nftAddress!
        )
      );
      if (holdsNFT) {
        await conversation.external(() =>
          VerifiedTxnModel.create({
            chat_id: guard.chat_id,
            user_id,
            walletAddress: address.toString(),
            txnHash,
            guardType: guard.guardType,
          })
        );

        try {
          const inviteLink = await ctx.api.createChatInviteLink(guard.chat_id, {
            member_limit: 1,
          });
          const fmtStr = chatLinkMessage(inviteLink.invite_link);
          // VERIFIED
          return await ctx.replyWithPhoto(
            new InputFile("./images/verified.jpg"),
            {
              caption: fmtStr.toString(),
              caption_entities: fmtStr.entities,
            }
          );
        } catch (e) {
          conversation.log(e);
          return await ctx.reply(couldntGenerateLinkMsg.toString(), {
            entities: couldntGenerateLinkMsg.entities,
          });
        }
      }

      const fmtString = getDoesNotHoldTokenMsg(
        params.tokensRequired!,
        params.tokenAddress!
      );

      return ctx.reply(fmtString.toString(), { entities: fmtString.entities });
    } catch (e) {
      conversation.log(e);
      if (e instanceof InvalidTxnError) {
        return ctx.reply(e.message);
      }
      await ctx.reply(VERIFICATION_ERR_TOKEN_MSG);
    }
  } else if (guard.guardType === GuardType.PaymentAndTokenAndNFT) {
    const fmtStr = nftTokenAndPayMessage(params);
    await ctx.reply(fmtStr.toString(), {
      entities: fmtStr.entities,
      reply_markup: {
        force_reply: true,
      },
    });

    const { message } = await conversation.waitFor("msg:text");
    if (!message) return;
    const txnHash = message.text;

    try {
      const address = await conversation.external(() =>
        checkTransaction(
          txnHash,
          params.chain.toUpperCase() as SupportedChains,
          params.walletAddress!,
          params.txnAmount!
        )
      );

      const holdsNFT = await conversation.external(() =>
        checkNFTHoldings(
          params.chain.toUpperCase() as SupportedChains,
          address,
          params.nftAddress!
        )
      );

      const holdsToken = await conversation.external(() =>
        checkTokenHoldings(
          params.chain.toUpperCase() as SupportedChains,
          address,
          params.tokenAddress!,
          params.tokensRequired!
        )
      );

      if (holdsNFT && holdsToken) {
        await conversation.external(() =>
          VerifiedTxnModel.create({
            chat_id: guard.chat_id,
            user_id,
            walletAddress: address.toString(),
            txnHash,
            guardType: guard.guardType,
          })
        );

        try {
          const inviteLink = await ctx.api.createChatInviteLink(guard.chat_id, {
            member_limit: 1,
          });
          const fmtStr = chatLinkMessage(inviteLink.invite_link);
          // VERIFIED
          return await ctx.replyWithPhoto(
            new InputFile("./images/verified.jpg"),
            {
              caption: fmtStr.toString(),
              caption_entities: fmtStr.entities,
            }
          );
        } catch (e) {
          conversation.log(e);
          return await ctx.reply(couldntGenerateLinkMsg.toString(), {
            entities: couldntGenerateLinkMsg.entities,
          });
        }
      }

      const fmtString = getDoesNotHoldTokenMsg(
        params.tokensRequired!,
        params.tokenAddress!
      );

      return ctx.reply(fmtString.toString(), { entities: fmtString.entities });
    } catch (e) {
      conversation.log(e);
      if (e instanceof InvalidTxnError) {
        return ctx.reply(e.message);
      }
      await ctx.reply(VERIFICATION_ERR_TOKEN_MSG);
    }
  } else {
    console.log(config.verifyWebUrl);
    const kb = new InlineKeyboard().webApp(
      "Click here to verify 💀",
      `${config.verifyWebUrl}/${chat_id}`
    );

    await ctx.replyWithPhoto(new InputFile("./data/default.jpg"), {
      caption:
        "Please click the button below to verify your identity and gain access to the requested group.",
      reply_markup: kb,
    });
  }
}

export async function standaloneVerificationConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  if (!ctx.from) return;
  const { ca, type } = ctx.session.poll_data;
  const fmtStr = standaloneVerificationMessage(type, ca);

  await ctx.reply(fmtStr.toString(), {
    entities: fmtStr.entities,
    reply_markup: {
      force_reply: true,
    },
  });

  const txnHash = await conversation.form.text();
  try {
    const walletAddr = await conversation.external(() =>
      check0eTxn(txnHash, "ETH" as SupportedChains)
    );
    if (type == "ERC20") {
      const tokenHoldings = await conversation.external(() =>
        checkTokenHoldings("ETH" as SupportedChains, walletAddr, ca, 2)
      );

      if (!tokenHoldings) {
        return await ctx.reply(
          "⚠️ You don't have the required tokens in your wallet"
        );
      }
    } else if (type === "ERC721") {
      const nftHolding = await conversation.external(() =>
        checkNFTHoldings("ETH" as SupportedChains, walletAddr, ca)
      );
      if (!nftHolding) {
        return await ctx.reply(
          "⚠️ You don't have the required NFT in your wallet"
        );
      }
    }

    const chat_id = conversation.session.chat_id;

    try {
      // Promote the user to admin with specific permissions
      await ctx.api.promoteChatMember(chat_id, ctx.from.id, {
        can_change_info: false,
        can_invite_users: true,
        can_pin_messages: false,
        can_post_messages: true,
        can_manage_chat: false,
      });
      await ctx.api.setChatAdministratorCustomTitle(chat_id, ctx.from.id, "✓");
    } catch (e) {
      // Error handling for user promotion
      console.error("Error promoting user:", e);
    }

    await GuardModel.updateOne(
      { chat_id },
      { $addToSet: { "portal_data.verifiedUsers": ctx.from.id } }
    );

    await ctx.reply("You have been verified successfully, proceed to vote!");
  } catch (e) {
    if (e instanceof InvalidTxnError) {
      return ctx.reply(e.message);
    }
    return ctx.reply(
      "⚠️Couldn't verify the wallet and token holdings, please check the transaction address or try again later!"
    );
  }
}
