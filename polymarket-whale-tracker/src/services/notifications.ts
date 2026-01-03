import { config } from "../config/index.js";
import { db } from "./database.js";

interface DepositAlert {
  walletAddress: string;
  amount: number;
  txHash: string;
  blockNumber: bigint;
  isNewWallet: boolean;
  depositId: number;
}

export const notifications = {
  async sendTelegramAlert(alert: DepositAlert): Promise<boolean> {
    const emoji = alert.isNewWallet ? "🚨 NEW WHALE" : "🐋 WHALE DEPOSIT";

    const message = `
${emoji} Alert!

💰 Amount: $${alert.amount.toLocaleString()} USDC
👛 Wallet: \`${alert.walletAddress}\`
${alert.isNewWallet ? "✨ Status: FIRST TIME DEPOSIT" : "🔄 Status: Returning user"}

🔗 Links:
- [View on Polygonscan](https://polygonscan.com/tx/${alert.txHash})
- [Wallet History](https://polygonscan.com/address/${alert.walletAddress})

⏰ Time: ${new Date().toLocaleString()}
    `.trim();

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: config.telegram.chatId,
            text: message,
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          }),
        }
      );

      const result = await response.json();
      const success = result.ok === true;

      // Log the notification (skip for test alerts with depositId=0)
      if (alert.depositId > 0) {
        await db.logNotification(
          alert.walletAddress,
          alert.depositId,
          "telegram",
          message,
          success,
          success ? undefined : JSON.stringify(result)
        );
      }

      return success;
    } catch (error: any) {
      console.error("Telegram notification error:", error);

      // Log the notification (skip for test alerts with depositId=0)
      if (alert.depositId > 0) {
        await db.logNotification(
          alert.walletAddress,
          alert.depositId,
          "telegram",
          message,
          false,
          error.message
        );
      }

      return false;
    }
  },
};
