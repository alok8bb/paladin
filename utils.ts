export function getFileExtension(filename: string): string | null {
  const extensionMatch = filename.match(/(?:\.([^.]+))?$/);
  if (extensionMatch) {
    return extensionMatch[1];
  } else {
    return null; // no extension found
  }
}

export function generateRandomSixDigitNumber(): number {
  // Generate a random number between 0 and 999999
  const randomNumber = Math.floor(Math.random() * 1000000);

  // Ensure the number is 6 digits by padding with leading zeros if necessary
  const sixDigitNumber = randomNumber.toString().padStart(6, "0");

  return parseInt(sixDigitNumber, 10);
}

export interface Pair {
  baseToken: {
    name: string;
    symbol: string;
  };
  priceChange: {
    m5: number;
    h1: number;
    h24: number;
  };
  pairAddress: string;
  dexId: string;
  priceNative: string;
  priceUsd: string;
  liquidity: {
    usd: number;
  };
  fdv: number;
}

export async function getTokenInformation(ca: string) {
  const res = await fetch(`https://api.dexscreener.io/latest/dex/tokens/${ca}`);

  if (!res.ok) {
    throw Error("Failed to fetch data!");
  }
  try {
    const data: {
      pairs: Pair[];
    } = await res.json();

    const pair = data.pairs[0];
    if (!pair || pair.dexId !== "uniswap") {
      throw Error("No pair was found!");
    }

    return pair;
  } catch (e) {
    console.log(e);
    throw Error("Failed to parse data!");
  }
}

export function getChangeEmoji(n: number) {
  if (n >= 0) {
    return "🟢";
  } else {
    return "🔴";
  }
}
