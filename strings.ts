import {
  bold,
  code,
  fmt,
  italic,
  link,
	underline,
} from "https://deno.land/x/grammy_parse_mode@1.10.0/format.ts";
import {
  Parameters,
  PortalData,
	SupportedChains,
} from "./conversations/guard.ts";
import { InlineKeyboard } from "https://deno.land/x/grammy@v1.24.0/mod.ts";
import { MyConversation } from "./bot.ts";
import { getChangeEmoji, Pair } from "./utils.ts";

export const GuardStrings = {
  already_protected: fmt`✊ This group is already being protected by Paladin`,
  insufficient_permissions: fmt`🔴 ${bold(
    "Insufficient Administrator Privileges"
  )}

🛡️ Please make sure the bot is added in the group as Administrator and has the permission to invite new users to the group.`,
  guardTypeSelection: fmt`${bold(
    "👇 Select the method of authentication for users"
  )}`,
  selectNetwork: fmt`${bold("🌐 Select network:")}
Please select the network for the Payment/Token verification`,
  enterEntryAmount: fmt`${bold("💵 Entry Amount")}
Enter the desired amount user must pay to get entry in the group, for example ${code(
    "0.01 ETH"
  )}:`,
  enterReceiverWallet: fmt`${bold("💳 Receiver Wallet")}
Enter the receiver wallet address to which the amount is to be sent:`,
  enterTokenAmount: fmt`${bold("🪙 Token Holdings Amount")}
Enter the amount of tokens user wallet must hold:`,
  enterTokenAddress: fmt`${bold("📌 Token Address")}
Send the token address of the corresponding token:`,
  enterNFTAddress: fmt`${bold("📌 NFT Address")}
Send the NFT address which user must hold:`,
};

export const tokenOnlyMessage = (parameters: Parameters) => {
  return fmt`${bold("Welcome to Paladin")}

🛡️ This group is being protected with Token Holdings protection.

To get the invite link for the group:
- User wallet must hold ${code(parameters.tokensRequired!)} tokens of ${code(
    parameters.tokenAddress!
  )}

${bold("Step 1")}: Create a ${code(
    `${parameters.chain.toUpperCase() === SupportedChains.SOL ?  0.001 :0} ${parameters.chain.toUpperCase()}`
  )} transaction from your wallet to same wallet.
    
${bold(
  "Step 2"
)}: Confirm the transaction, wait for it to be approved by the network. Then paste only the transaction id/hash in the next message.

${bold("Step 3")}: Paladin will verify the ${code(
    `${parameters.chain.toUpperCase() === SupportedChains.SOL ?  0.001 :0} ${parameters.chain.toUpperCase()}`
  )} transaction and check for required tokens in the same wallet and provide the join link.
    
Please send the transaction hash:`;
};

export const tokenAndPayMessage = (parameters: Parameters) => {
  return fmt`${bold("Welcome to Paladin")}

🛡️ This group is being protected with Token Holdings and Pay protection.

To get the invite link for the group:
- User must send ${code(
    parameters.txnAmount!
  )} ${parameters.chain.toUpperCase()} to ${code(parameters.walletAddress!)}.

- User wallet must hold ${code(parameters.tokensRequired!)} tokens of ${code(
    parameters.tokenAddress!
  )}.

${bold("Step 1")}: Create a ${code(
    `${parameters.txnAmount} ${parameters.chain.toUpperCase()}`
  )} transaction from your wallet to ${code(parameters.walletAddress!)}.
    
${bold(
  "Step 2"
)}: Confirm the transaction, wait for it to be approved by the network. Then paste only the transaction id/hash in the next message.

${bold("Step 3")}: Paladin will verify the ${code(
    `${code(parameters.txnAmount!)} ${parameters.chain.toUpperCase()}`
  )} transaction and check for required tokens in the same wallet and provide the join link.

Please send the transaction hash:    `;
};

export const payMessage = (parameters: Parameters) => {
  return fmt`${bold("Welcome to Paladin")}

🛡️ This group is being protected with Pay protection.

To get the invite link for the group:
- User must send ${code(
    parameters.txnAmount!
  )} ${parameters.chain.toUpperCase()} to ${code(parameters.walletAddress!)}.


${bold("Step 1")}: Create a ${code(
    `${parameters.txnAmount} ${parameters.chain.toUpperCase()}`
  )} transaction from your wallet to ${code(parameters.walletAddress!)}.
    
${bold(
  "Step 2"
)}: Confirm the transaction, wait for it to be approved by the network. Then paste only the transaction id/hash in the next message.

${bold("Step 3")}: Paladin will verify the ${code(
    `${code(parameters.txnAmount!)} ${parameters.chain.toUpperCase()}`
  )} transaction and provide the join link.
    
Please send the transaction hash: `;
};



export const chatLinkMessage = (link: string) => {
  return fmt`✅ Verification Successful
Here's your join link: ${link}`;
};

export const couldntGenerateLinkMsg = fmt`${bold(
  "Paladin could not generate group invite link at the moment."
)}

Please try contacting the group administrator.`;

export const nftOnlyMessage = (parameters: Parameters) => {
  return fmt`${bold("Welcome to Paladin")}

🛡️ This group is being protected with NFT Holdings protection.

To get the invite link for the group:
- User wallet must hold an NFT of ${code(parameters.nftAddress!)}

${bold("Step 1")}: Create a transaction from your wallet to same wallet.
    
${bold(
  "Step 2"
)}: Confirm the transaction, wait for it to be approved by the network. Then paste only the transaction id/hash in the next message.

${bold("Step 3")}: Paladin will verify the transaction and check for required NFT in the same wallet and provide the join link.
    
Please send the transaction hash:`;
};

export const nftAndPayMessage = (parameters: Parameters) => {
  return fmt`${bold("Welcome to Paladin")}

🛡️ This group is being protected with NFT Holdings and Pay protection.

To get the invite link for the group:
- User must send ${code(
    parameters.txnAmount!
  )} ${parameters.chain.toUpperCase()} to ${code(parameters.walletAddress!)}.

- User wallet must hold an NFT of ${code(parameters.nftAddress!)}.

${bold("Step 1")}: Create a ${code(
    `${parameters.txnAmount} ${parameters.chain.toUpperCase()}`
  )} transaction from your wallet to ${code(parameters.walletAddress!)}.
    
${bold(
  "Step 2"
)}: Confirm the transaction, wait for it to be approved by the network. Then paste only the transaction id/hash in the next message.

${bold("Step 3")}: Paladin will verify the ${code(
    `${code(parameters.txnAmount!)} ${parameters.chain.toUpperCase()}`
  )} transaction and check for required NFT in the same wallet and provide the join link.

Please send the transaction hash:`;
};

export const nftTokenAndPayMessage = (parameters: Parameters) => {
  return fmt`${bold("Welcome to Paladin")}

🛡️ This group is being protected with NFT Holdings and Pay protection.

To get the invite link for the group:
- User must send ${code(
    parameters.txnAmount!
  )} ${parameters.chain.toUpperCase()} to ${code(parameters.walletAddress!)}.

- User wallet must hold ${code(parameters.tokensRequired!)} tokens of ${code(
    parameters.tokenAddress!
  )}.

- User wallet must hold an NFT of ${code(parameters.nftAddress!)}.

${bold("Step 1")}: Create a ${code(
    `${parameters.txnAmount} ${parameters.chain.toUpperCase()}`
  )} transaction from your wallet to ${code(parameters.walletAddress!)}.
    
${bold(
  "Step 2"
)}: Confirm the transaction, wait for it to be approved by the network. Then paste only the transaction id/hash in the next message.

${bold("Step 3")}: Paladin will verify the ${code(
    `${code(parameters.txnAmount!)} ${parameters.chain.toUpperCase()}`
  )} transaction and check for required NFT in the same wallet and provide the join link.

Please send the transaction hash:`;
};

export const GOVERNANCE_INTRO_STR = fmt`${bold("🗳️ Advanced Features")}
Advanced Features is a powerful capability offered by Paladin, where group owners can set the ERC20 or ERC721 contract address of their project. This unlocks a suite of exclusive features for the group members: 

${bold(
  "🗳️ Governance"
)}: Admins of the protected group can create polls, and only verified users who are actual holders of the token/NFT can participate, ensuring a secure and representative decision-making process. 

${bold(
  "📊 Analytics"
)}: Group members can use the /analytics command to access valuable information about the project, such as liquidity, price changes, and detailed charts, empowering them with data-driven insights.
`;

export const editButtonMsg = fmt`${bold("🔘 Edit Buttons")}
Add or remove buttons for the group's portal, "Click to Verify" button is mandatory and cannot be changed. You can add upto 5 buttons.`;
export const getEditButtonMsgKeyboard = (
  data: PortalData
) => {
  const keyboard = new InlineKeyboard();
  data.buttons.forEach((button) => {
    if (button.id === 1) {
      keyboard.text(button.text, "Verify Button").row();
    } else {
      keyboard.text(button.text, `o/${button.id}`).row();
    }
  });

  keyboard
    .text("-----------", "Empty")
    .row()
    .text("+ Add Button", "add_button")
    .row()
    .text("Back", "back");

  return keyboard;
};

export function isValidLink(text: string): boolean {
  const urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
  return urlPattern.test(text);
}
export async function getRandomNumber(conversation: MyConversation) {
  return Math.floor(10000 + (await conversation.random()) * 90000);
}

export function getPollMessage(
  o: {
    text: string;
    votes: number;
    id: number;
  }[],
  question: string,
  id: string
) {
  let pollStr = fmt`💭 ${bold(question)}

📊 Results: `;
  o.forEach(
    (op) =>
      (pollStr = fmt`${pollStr}
${bold(op.text)} - ${italic(op.votes + " votes")}`)
  );
  pollStr = fmt`${pollStr}
    
${italic("Verified users can vote by clicking the buttons below.")}`;

  const kb = new InlineKeyboard();
  o.forEach((option) => {
    kb.text(option.text, `vote:${id}:${option.id}`).row();
  });

  return { pollStr, kb };
}

export const standaloneVerificationMessage = (
  type: "ERC20" | "ERC721",
  ca: string
) => {
  return fmt`${bold("Welcome to Paladin")}

📊 To participate in the group's governance, you need to verify your holdings.
- User wallet must be holder of ${
    type === "ERC20" ? "a token" : "an NFT"
  } of ${code(ca)} address

${bold("Step 1")}: Create a transaction from your wallet to same wallet.
    
${bold(
  "Step 2"
)}: Confirm the transaction, wait for it to be approved by the network. Then paste only the transaction id/hash in the next message.

${bold(
  "Step 3"
)}: Paladin will verify the transaction and check for required token/NFT in the same wallet and whitelist you for polls.
    
Please send the transaction hash:`;
};

export const VERIFICATION_ERR_TOKEN_MSG = `🔴 Token verification failed. Please make sure you have the required tokens in your wallet and try again.`;
export const VERIFICATION_ERR_NFT_MSG = `🔴 NFT verification failed. Please make sure you have the required NFT in your wallet and try again.`;

export function getCustomizePortalText(text: string) {
  return fmt`${bold("✨ Customize Portal")}

${text}`;
}

export function getDoesNotHoldTokenMsg(
  tokensRequired: number,
  tokenAddress: string
) {
  return fmt`❌ The related wallet does not hold ${code(
    tokensRequired
  )} TOKENS of ${code(tokenAddress)}`;
}

export function getDoesNotHoldNFTMsg(nftAddress: string) {
  return fmt`❌ The related wallet does not hold an NFT of ${code(nftAddress)}`;
}

export const getPairDataString = (pair: Pair, ca: string) => {
  const { m5, h1, h24 } = pair.priceChange,
    priceChange = { m5, h1, h24 };
  return fmt`${link(
    `🪙 ${pair.baseToken.name}(${pair.baseToken.symbol})`,
    `https://dexscreener.com/ethereum/${ca}`
  )}
────────
🔗 ${bold("Ethereum")}
📊 ${bold("MCap")}: $${Math.round(pair.fdv).toLocaleString()}
💧 ${bold("Liquidity")}: $${Math.round(pair.liquidity.usd).toLocaleString()}
🏷️ ${bold("Price")}: $${pair.priceUsd}

${Object.entries(priceChange)
  .map(
    ([key, value]) =>
      fmt`${getChangeEmoji(value)} ${bold(
        (() => {
          return key.slice(1) + key[0];
        })()
      )}: ${value}%`
  )
  .reduce((acc, value, index) => {
    return fmt`${acc}${index === 0 ? fmt`` : fmt` `}${value}`;
  }, fmt``)}
`;
};

export const START_TEXT = fmt`Paladin is an advanced Telegram bot platform providing comprehensive group protection and management features for Web3 communities.

🛡️ ${bold("Token-Gated Access")} with support for multiple verification methods including token holdings, NFTs, and payment verification across ETH and SOL networks.

🗳️ ${bold("Governance System")} enabling token/NFT holders to participate in secure polls and decision-making processes.

📊 ${bold("Analytics Dashboard")} with real-time token data, user statistics, and message analytics with chart generation.

🤖 ${bold("AI Assistant")} powered by GPT-4, trainable with project-specific data for intelligent community support.

Start protecting your community by clicking on /new`
