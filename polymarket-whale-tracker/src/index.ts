import { config } from "./config/index.js";
import { blockchain } from "./services/blockchain.js";
import { notifications } from "./services/notifications.js";
import pino from "pino";

const logger = pino({ level: "info" });

export async function main() {
  console.log("=".repeat(50));
  console.log("🐋 PolyWolyTroly");
  console.log("=".repeat(50));
  console.log(`Environment: ${config.app.nodeEnv}`);
  console.log(`Min deposit threshold: $${config.app.minDepositAmount.toLocaleString()}`);

  // Test Telegram connection
  console.log("Testing Telegram connection...");
  const testResult = await notifications.sendTelegramAlert({
    walletAddress: "0x0000000000000000000000000000000000000000",
    amount: 0,
    txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    blockNumber: 0n,
    isNewWallet: false,
    depositId: 0,
  });

  if (!testResult) {
    console.log("⚠️ Telegram test failed - check your bot token and chat ID");
  } else {
    console.log("✅ Telegram connection successful");
  }

  // Get current block
  const currentBlock = await blockchain.getCurrentBlock();
  console.log(`Current Polygon block: ${currentBlock}`);

  // Start listening
  await blockchain.startListening();

  // Keep process alive
  console.log("Tracker is running. Press Ctrl+C to stop.");
}

// Only auto-run when executed directly (not when imported)
// Use decodeURIComponent to handle spaces in paths
const currentFileUrl = decodeURIComponent(new URL(import.meta.url).pathname);
const executedFile = process.argv[1];
const isMainModule = currentFileUrl === executedFile;

if (isMainModule) {
  main().catch((error) => {
    logger.error({ msg: "Fatal error", error });
    process.exit(1);
  });
}
