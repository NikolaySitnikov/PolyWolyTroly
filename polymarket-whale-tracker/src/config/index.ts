import "dotenv/config";

export const config = {
  alchemy: {
    wssUrl: process.env.ALCHEMY_WSS_URL!,
    httpUrl: process.env.ALCHEMY_HTTP_URL!,
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    url: process.env.REDIS_URL!,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    chatId: process.env.TELEGRAM_CHAT_ID!,
  },
  app: {
    minDepositAmount: Number(process.env.MIN_DEPOSIT_AMOUNT) || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
  },
};

// Validate required env vars
const required = [
  "ALCHEMY_WSS_URL",
  "DATABASE_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
