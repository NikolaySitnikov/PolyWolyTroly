import pg from "pg";
import { config } from "../config/index.js";

const { Pool } = pg;

const pool = new Pool({ connectionString: config.database.url });

export interface Wallet {
  address: string;
  firstSeenAt: Date;
  firstDepositAmount: number;
  totalDeposited: number;
  depositCount: number;
  isNotified: boolean;
}

export const db = {
  // Check if wallet exists in our database
  async walletExists(address: string): Promise<boolean> {
    const result = await pool.query(
      "SELECT 1 FROM wallets WHERE address = $1",
      [address.toLowerCase()]
    );
    return result.rows.length > 0;
  },

  // Create new wallet record
  async createWallet(
    address: string,
    depositAmount: number,
    txHash: string
  ): Promise<void> {
    await pool.query(
      `INSERT INTO wallets (address, first_deposit_amount, first_deposit_tx, total_deposited, deposit_count)
       VALUES ($1, $2, $3, $2, 1)
       ON CONFLICT (address) DO NOTHING`,
      [address.toLowerCase(), depositAmount, txHash]
    );
  },

  // Record a deposit
  async recordDeposit(
    txHash: string,
    walletAddress: string,
    amount: number,
    blockNumber: bigint
  ): Promise<number | null> {
    try {
      const result = await pool.query(
        `INSERT INTO deposits (tx_hash, wallet_address, amount, block_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [txHash, walletAddress.toLowerCase(), amount, blockNumber.toString()]
      );

      // Update wallet totals
      await pool.query(
        `UPDATE wallets
         SET total_deposited = total_deposited + $1,
             deposit_count = deposit_count + 1,
             updated_at = NOW()
         WHERE address = $2`,
        [amount, walletAddress.toLowerCase()]
      );

      return result.rows[0]?.id;
    } catch (error: any) {
      // Duplicate tx_hash - already processed
      if (error.code === "23505") return null;
      throw error;
    }
  },

  // Log notification
  async logNotification(
    walletAddress: string,
    depositId: number,
    type: string,
    message: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await pool.query(
      `INSERT INTO notifications (wallet_address, deposit_id, notification_type, message, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [walletAddress.toLowerCase(), depositId, type, message, success, errorMessage]
    );
  },

  // Get wallet info
  async getWallet(address: string): Promise<Wallet | null> {
    const result = await pool.query(
      "SELECT * FROM wallets WHERE address = $1",
      [address.toLowerCase()]
    );
    return result.rows[0] || null;
  },

  // Get dashboard statistics
  async getStats(): Promise<{
    whaleCount: number;
    totalVolume: number;
    alertsToday: number;
    newWhalesThisWeek: number;
  }> {
    // Get whale count
    const whaleCountResult = await pool.query("SELECT COUNT(*) as count FROM wallets");
    const whaleCount = parseInt(whaleCountResult.rows[0]?.count || "0", 10);

    // Get total volume
    const totalVolumeResult = await pool.query("SELECT SUM(amount) as sum FROM deposits");
    const totalVolume = parseInt(totalVolumeResult.rows[0]?.sum || "0", 10);

    // Get alerts today (deposits in last 24 hours)
    const alertsTodayResult = await pool.query(
      "SELECT COUNT(*) as count FROM deposits WHERE created_at >= NOW() - INTERVAL '24 hours'"
    );
    const alertsToday = parseInt(alertsTodayResult.rows[0]?.count || "0", 10);

    // Get new whales this week
    const newWhalesResult = await pool.query(
      "SELECT COUNT(*) as count FROM wallets WHERE created_at >= NOW() - INTERVAL '7 days'"
    );
    const newWhalesThisWeek = parseInt(newWhalesResult.rows[0]?.count || "0", 10);

    return {
      whaleCount,
      totalVolume,
      alertsToday,
      newWhalesThisWeek,
    };
  },

  // Get all wallets with pagination
  async getAllWallets(
    page: number,
    limit: number
  ): Promise<{
    wallets: Wallet[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    const walletsResult = await pool.query(
      `SELECT * FROM wallets ORDER BY total_deposited DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) as count FROM wallets");
    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    return {
      wallets: walletsResult.rows,
      total,
      page,
      limit,
    };
  },

  // Get recent deposits with pagination and optional wallet filter
  async getRecentDeposits(
    page: number,
    limit: number,
    walletAddress?: string
  ): Promise<{
    deposits: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    let depositsQuery: string;
    let countQuery: string;
    let queryParams: any[];

    if (walletAddress) {
      depositsQuery = `SELECT * FROM deposits WHERE wallet_address = $3 ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      countQuery = `SELECT COUNT(*) as count FROM deposits WHERE wallet_address = $1`;
      queryParams = [limit, offset, walletAddress.toLowerCase()];
    } else {
      depositsQuery = `SELECT * FROM deposits ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      countQuery = `SELECT COUNT(*) as count FROM deposits`;
      queryParams = [limit, offset];
    }

    const depositsResult = await pool.query(depositsQuery, queryParams);
    const countResult = await pool.query(
      countQuery,
      walletAddress ? [walletAddress.toLowerCase()] : []
    );
    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    return {
      deposits: depositsResult.rows,
      total,
      page,
      limit,
    };
  },

  // Close pool (for cleanup)
  async close(): Promise<void> {
    await pool.end();
  },
};
