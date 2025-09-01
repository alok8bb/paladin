import mongoose, { Document, Schema } from "npm:mongoose";

export interface Poll extends Document {
  id: string;
  options: {
    text: string;
    votes: number;
    id: number;
  }[];
  chat_id: number;
  message_id: number;
  question: string;
  ca: string;
  type: "ERC20" | "ERC721";
  voters: number[];
}

const PollSchema = new Schema<Poll>(
  {
    id: { type: String, required: true },
    options: [
      {
        text: { type: String, required: true },
        votes: { type: Number, default: 0 },
        id: { type: Number, required: true },
      },
    ],
    chat_id: { type: Number, required: true },
    message_id: { type: Number, required: true },
    question: { type: String, required: true },
    ca: { type: String, required: true },
    type: { type: String, enum: ["ERC20", "ERC721"], required: true },
    voters: [{ type: Number }],
  },
  { timestamps: true }
);

export const PollModel = mongoose.model<Poll>("polls", PollSchema);
