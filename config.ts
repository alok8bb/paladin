interface Config {
  // Bot Configuration
  botToken: string;
  isEnabled: boolean;
  
  // Database
  databaseUri: string;
  
  // Blockchain RPCs
  ethereumRpc: string;
  solanaRpc: string;
  
  // External APIs
  heliusApiKey: string;
  openAiApiKey: string;
  chartApiUrl: string;
  
  // Verification
  verifyWebUrl: string;
  cloudflareTurnstileSecret: string;
  
  // Environment
  environment: string;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = Deno.env.get(key);
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
};

export const config: Config = {
  // Bot Configuration
  botToken: getEnvVar("BOT_TOKEN"),
  isEnabled: getEnvVar("BOT_ENABLED", "true") === "true",
  
  // Database
  databaseUri: getEnvVar("DATABASE_URI", "mongodb://localhost:27017/paladin"),
  
  // Blockchain RPCs
  ethereumRpc: getEnvVar("ETHEREUM_RPC", "https://eth.llamarpc.com"),
  solanaRpc: getEnvVar("SOLANA_RPC", "https://api.mainnet-beta.solana.com"),
  
  // External APIs
  heliusApiKey: getEnvVar("HELIUS_API_KEY"),
  openAiApiKey: getEnvVar("OPENAI_API_KEY"),
  // I lost the chart generation code, so it won't work 
  chartApiUrl: getEnvVar("CHART_API_URL", "https://api.paladin.live/chart"),
  
  // Verification
  verifyWebUrl: getEnvVar("VERIFY_WEB_URL", "https://verify.paladin.live"),
  
  // Environment
  environment: getEnvVar("NODE_ENV", "development"),
};
