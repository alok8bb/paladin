import mongoose from "npm:mongoose";

export const connectDB = async (MONGO_URI: string) => {
  try {
    await mongoose.connect(MONGO_URI);
  } catch (e) {
    console.error(`MongoDB connection error\n${e}`);
    Deno.exit(1);
  }
};
