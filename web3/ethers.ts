import { ethers, formatEther } from "npm:ethers";
import { C_ABI, NFT_ABI } from "./abi.ts";
import { config } from "../config.ts";
import { SupportedChains } from "../conversations/guard.ts";
import * as solana from "npm:@solana/web3.js";

const solConnection = new solana.Connection(
	config.solanaRpc,
);
const ethProvider = new ethers.JsonRpcProvider(
	config.ethereumRpc,
);

export class InvalidTxnError extends Error {}

export const checkTransaction = async (
	txnHash: string,
	chain: SupportedChains,
	receiver: string,
	amount: number,
) => {
	if (chain.toUpperCase() === SupportedChains.ETH) {
		const res = await ethProvider.getTransaction(txnHash);
		if (!res) {
			throw new InvalidTxnError(
				"❌ Couldn't find the transaction, please try with different hash",
			);
		}

		if (
			Number(formatEther(res.value)) !== amount ||
			res.to?.toLowerCase() !== receiver.toLowerCase()
		) {
			throw new InvalidTxnError(
				`🔴 Transaction does not verify the payment, please try with different transaction! Please send ${amount}${chain} to ${receiver} and try again.`,
			);
		}

		return res.from.toLowerCase();
	} else if (chain.toUpperCase() === SupportedChains.SOL) {
		const response = await fetch(
			`https://api.helius.xyz/v0/transactions?api-key=${config.heliusApiKey}&commitment=confirmed`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					"transactions": [
						txnHash,
					],
				}),
			},
		);

		if (!response.ok) {
			if (response.status == 400) {
				throw new InvalidTxnError("Invalild Transaction ID");
			}

			throw new InvalidTxnError(
				"Server busy, please try again after some time!",
			);
		}

		const data: {
			nativeTransfers: {
				fromUserAccount: string;
				toUserAcccount: string;
				amount: number;
			}[];
		}[] = await response.json();
		if (!data[0]) {
			throw new InvalidTxnError("Invalid transaction found");
		}

		if (
			data[0].nativeTransfers[0].amount / solana.LAMPORTS_PER_SOL !== amount ||
			data[0].nativeTransfers[0].toUserAcccount !== receiver
		) {
			throw new InvalidTxnError(
				`🔴 Transaction does not verify the payment, please try with different transaction! Please send ${amount}${chain} to ${receiver} and try again.`,
			);
		}

		return data[0].nativeTransfers[0].fromUserAccount;
	} else {
		throw new InvalidTxnError(
			`🔴 Couldn't verify ${amount}${chain} transaction, please contact administrator with transaction hash.`,
		);
	}
};

export const check0eTxn = async (txnHash: string, chain: SupportedChains) => {
	if (chain.toUpperCase() === SupportedChains.ETH) {
		const res = await ethProvider.getTransaction(txnHash);
		if (!res) {
			throw new InvalidTxnError(
				"❌ Couldn't find the transaction, please try with different hash",
			);
		}

		if (res.to !== res.from) {
			throw new InvalidTxnError(
				"🔴 Transaction does not verify the ownership of wallet, please try with different transaction!",
			);
		}
		return res.to.toLowerCase();
	} else if (chain.toUpperCase() === SupportedChains.SOL) {
		const response = await fetch(
			`https://api.helius.xyz/v0/transactions?api-key=${config.heliusApiKey}&commitment=confirmed`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					"transactions": [
						txnHash,
					],
				}),
			},
		);

		if (!response.ok) {
			if (response.status == 400) {
				throw new InvalidTxnError("Invalild Transaction ID");
			}

			throw new InvalidTxnError(
				"Invalid transaction or server busy, please try again after some time!",
			);
		}

		const data: {
			nativeTransfers: {
				fromUserAccount: string;
				toUserAccount: string;
				amount: number;
			}[];
		}[] = await response.json();
		if (!data[0]) {
			throw new InvalidTxnError("Invalid transaction found");
		}

		const txn = data[0].nativeTransfers[0];
		if (
			txn.fromUserAccount !== txn.toUserAccount
		) {
			throw new InvalidTxnError(
				"🔴 Transaction does not verify the ownership of wallet, please try with different transaction!",
			);
		}
		return txn.toUserAccount;
	} else {
		throw new InvalidTxnError(
			`🔴 Couldn't verify 0${chain} transaction, please contact administrator with transaction hash.`,
		);
	}
};

export const checkTokenHoldings = async (
	chain: SupportedChains,
	wallet: string,
	tokenAddress: string,
	tokensRequired: number,
) => {
	if (chain.toUpperCase() === SupportedChains.ETH) {
		try {
			const contract = new ethers.Contract(
				tokenAddress,
				C_ABI,
				ethProvider,
			);
			const balance: bigint = await contract.balanceOf(wallet);
			const decimals = await contract.decimals();
			const divisor = BigInt(10) ** BigInt(decimals);
			
			// Calculate balance using correct decimals
			if ((balance / divisor) > tokensRequired - 1) {
				return true;
			}
			return false;
		} catch (e) {
			return false;
		}
	} else if (chain.toUpperCase() === SupportedChains.SOL) {
		const accountKey = new solana.PublicKey(wallet);
		const mintAccount = new solana.PublicKey(tokenAddress);	
		const tokenAccounts = await solConnection.getTokenAccountsByOwner(
			accountKey,
			{ mint: mintAccount },
		);
		if (!tokenAccounts.value[0] || !tokenAccounts.value[0].pubkey) {
			return false;
		}
		const tokenAccount = tokenAccounts.value[0].pubkey;

		const balance =
			(await solConnection.getTokenAccountBalance(tokenAccount)).value.uiAmount;

		if (!balance) return false;

		if (balance < tokensRequired) {
			return false;
		} else {
			return true;
		}
	}

	return false;
};

export const checkNFTHoldings = async (
	chain: SupportedChains,
	wallet: string,
	nftAddress: string,
) => {
	if (chain.toUpperCase() === SupportedChains.ETH) {
		try {
			const contract = new ethers.Contract(
				nftAddress,
				NFT_ABI,
				ethProvider,
			);
			const balance: bigint = await contract.balanceOf(wallet);
			if (balance > 0) {
				return true;
			}
			return false;
		} catch (e) {
			return false;
		}
	} else if (chain.toUpperCase() === SupportedChains.SOL) {
		const accountKey = new solana.PublicKey(wallet);
		const mintAccount = new solana.PublicKey(nftAddress);
		const tokenAccounts = await solConnection.getTokenAccountsByOwner(
			accountKey,
			{ mint: mintAccount },
		);
		if (!tokenAccounts.value[0] || !tokenAccounts.value[0].pubkey) {
			return false;
		}
		const tokenAccount = tokenAccounts.value[0].pubkey;

		const balance =
			(await solConnection.getTokenAccountBalance(tokenAccount)).value.uiAmount;
		if (!balance) return false;

		if (balance !== 1) {
			return false;
		} else {
			return true;
		}
	}

	return false;
};
