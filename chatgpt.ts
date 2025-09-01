import OpenAI from "npm:openai";
import { config } from "./config.ts";

const openai = new OpenAI({ apiKey: config.openAiApiKey });
export async function getAnswer(context: string, question: string, ca: string) {
  const data = await getTokenData(ca);
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are Paladin's AI assistant for a Web3 project. Using the contextual information from here:
${context}

${data}

Answer the questions asked by the users in plain text format, do not use markdown.`,
      },
      { role: "user", content: question },
    ],
    model: "gpt-4-turbo",
  });

  return completion.choices[0].message.content;
}

export async function getTokenData(ca: string) {
  const data = await fetch(
    `https://api.dexscreener.io/latest/dex/tokens/${ca}`
  );

  if (!data.ok) {
    return "";
  }
  try {
    const d = await data.json();
    const token = d["pairs"][0];
    const price = token["priceUsd"];
    const liquidity = token["liquidity"]["usd"];
    const marketcap = token["fdv"];

    return `Price: ${price}
		Liquidity: ${liquidity}
		Marketcap: ${marketcap}`;
  } catch (e) {
    console.error("Error fetching token data", "API", { ca, error: e });
    return "";
  }
}
