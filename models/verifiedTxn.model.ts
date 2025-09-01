import mongoose, { Document, Schema } from "npm:mongoose";
import { GuardType } from "../conversations/guard.ts";

export interface Transaction extends Document {
  guardType: GuardType;
  txnHash: string;
  walletAddress: string;
  chat_id: number;
  user_id: number;
}

const VerifiedTxnSchema = new Schema<Transaction>(
  {
    guardType: {
      type: String,
      enum: [
        "normal",
        "token_only",
        "payment",
        "payment_and_token",
        "nft_only",
        "payment_and_nft",
        "payment_and_token_and_nft",
      ],
      required: true,
    },
    chat_id: { type: Number, required: true },
    user_id: { type: Number, required: true },
    walletAddress: { type: String, required: true },
    txnHash: { type: String, required: true },
  },
  { timestamps: true }
);

export const VerifiedTxnModel = mongoose.model<Transaction>(
  "verifiedTxns",
  VerifiedTxnSchema
);
