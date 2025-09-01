import mongoose, { Document, Schema } from "npm:mongoose";
import { Guard } from "../conversations/guard.ts";

export interface intervals {
  "0-1": number;
  "1-2": number;
  "2-3": number;
  "3-4": number;
  "4-5": number;
  "5-6": number;
  "6-7": number;
  "7-8": number;
  "8-9": number;
  "9-10": number;
  "10-11": number;
  "11-12": number;
  "12-13": number;
  "13-14": number;
  "14-15": number;
  "15-16": number;
  "16-17": number;
  "17-18": number;
  "18-19": number;
  "19-20": number;
  "20-21": number;
  "21-22": number;
  "22-23": number;
  "23-0": number;
}

export interface GuardDB extends Document, Guard {
  messageAnalytics: {
    timeIntervals: intervals;
  };
  userAnalytics: User[];
}

interface User {
  user_id: number;
  name: string;
  messageCount: number;
  username: string | undefined;
}

export function getTopUsers(users: User[]) {
  return users.sort((a, b) => b.messageCount - a.messageCount).slice(0, 5);
}

const GuardSchema = new Schema<GuardDB>(
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
    parameters: {
      walletAddress: { type: String },
      txnAmount: { type: Number },
      tokenAddress: { type: String },
      tokensRequired: { type: Number },
      nftAddress: { type: String },
      chain: { type: String, required: true },
    },
    portal_data: {
      text: { type: String },
      buttons: [
        {
          text: { type: String },
          link: { type: String },
          id: { type: Number },
        },
      ],
      governanceParams: {
        ca: { type: String },
        type: { type: String, default: "ERC20" },
      },
      verifiedUsers: {
        type: [Number],
        default: [],
      },
      trainingData: {
        type: "String",
        required: false,
      },
      price: {
        type: Object,
        required: false,
      },
    },
    messageAnalytics: {
      timeIntervals: {
        "0-1": { type: Number, default: 0 },
        "1-2": { type: Number, default: 0 },
        "2-3": { type: Number, default: 0 },
        "3-4": { type: Number, default: 0 },
        "4-5": { type: Number, default: 0 },
        "5-6": { type: Number, default: 0 },
        "6-7": { type: Number, default: 0 },
        "7-8": { type: Number, default: 0 },
        "8-9": { type: Number, default: 0 },
        "9-10": { type: Number, default: 0 },
        "10-11": { type: Number, default: 0 },
        "11-12": { type: Number, default: 0 },
        "12-13": { type: Number, default: 0 },
        "13-14": { type: Number, default: 0 },
        "14-15": { type: Number, default: 0 },
        "15-16": { type: Number, default: 0 },
        "16-17": { type: Number, default: 0 },
        "17-18": { type: Number, default: 0 },
        "18-19": { type: Number, default: 0 },
        "19-20": { type: Number, default: 0 },
        "20-21": { type: Number, default: 0 },
        "21-22": { type: Number, default: 0 },
        "22-23": { type: Number, default: 0 },
        "23-0": { type: Number, default: 0 },
      },
    },
    userAnalytics: [
      {
        user_id: { type: Number },
        name: { type: String },
        messageCount: { type: Number },
        username: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const GuardModel = mongoose.model<GuardDB>("guards", GuardSchema);
