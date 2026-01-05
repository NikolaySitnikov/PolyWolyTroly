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

  // Get dashboard statistics with trend calculations
  async getStats(): Promise<{
    whaleCount: number;
    whaleCountTrend: number;
    totalVolume: number;
    totalVolumeTrend: number;
    alertsToday: number;
    newWhalesThisWeek: number;
  }> {
    // Get current whale count
    const whaleCountResult = await pool.query("SELECT COUNT(*) as count FROM wallets");
    const whaleCount = parseInt(whaleCountResult.rows[0]?.count || "0", 10);

    // Get whale count from 7 days ago (for trend)
    const whaleCountLastWeekResult = await pool.query(
      "SELECT COUNT(*) as count FROM wallets WHERE created_at < NOW() - INTERVAL '7 days'"
    );
    const whaleCountLastWeek = parseInt(whaleCountLastWeekResult.rows[0]?.count || "0", 10);

    // Calculate whale trend: % change week over week
    const whaleCountTrend = whaleCountLastWeek > 0
      ? Math.round(((whaleCount - whaleCountLastWeek) / whaleCountLastWeek) * 100 * 100) / 100
      : 0;

    // Get total volume (all time)
    const totalVolumeResult = await pool.query("SELECT SUM(amount) as sum FROM deposits");
    const totalVolume = parseInt(totalVolumeResult.rows[0]?.sum || "0", 10);

    // Get volume from before last 7 days (for trend)
    const volumeLastWeekResult = await pool.query(
      "SELECT SUM(amount) as sum FROM deposits WHERE created_at < NOW() - INTERVAL '7 days'"
    );
    const volumeLastWeek = parseInt(volumeLastWeekResult.rows[0]?.sum || "0", 10);

    // Calculate volume trend: % change week over week
    const totalVolumeTrend = volumeLastWeek > 0
      ? Math.round(((totalVolume - volumeLastWeek) / volumeLastWeek) * 100 * 100) / 100
      : 0;

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
      whaleCountTrend,
      totalVolume,
      totalVolumeTrend,
      alertsToday,
      newWhalesThisWeek,
    };
  },

  // Get all wallets with pagination and sorting
  async getAllWallets(
    page: number,
    limit: number,
    sortBy: 'total_deposited' | 'deposit_count' | 'first_seen_at' = 'total_deposited',
    sortDir: 'asc' | 'desc' = 'desc'
  ): Promise<{
    wallets: Wallet[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    // Map frontend field names to database column names (they match in this case)
    const validSortFields = ['total_deposited', 'deposit_count', 'first_seen_at'];
    const validSortDirs = ['asc', 'desc'];

    // Validate and sanitize sort parameters to prevent SQL injection
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'total_deposited';
    const safeSortDir = validSortDirs.includes(sortDir) ? sortDir.toUpperCase() : 'DESC';

    const walletsResult = await pool.query(
      `SELECT * FROM wallets ORDER BY ${safeSortBy} ${safeSortDir} LIMIT $1 OFFSET $2`,
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

  // Get recent deposits with pagination and optional filters
  async getRecentDeposits(
    page: number,
    limit: number,
    walletAddress?: string,
    minAmount?: number
  ): Promise<{
    deposits: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    // Build WHERE clause dynamically based on filters
    const conditions: string[] = [];
    const queryParams: any[] = [limit, offset];
    const countParams: any[] = [];
    let paramIndex = 3;
    let countParamIndex = 1;

    if (walletAddress) {
      conditions.push(`wallet_address = $${paramIndex}`);
      queryParams.push(walletAddress.toLowerCase());
      countParams.push(walletAddress.toLowerCase());
      paramIndex++;
      countParamIndex++;
    }

    if (minAmount !== undefined && minAmount > 0) {
      conditions.push(`amount >= $${paramIndex}`);
      queryParams.push(minAmount);
      countParams.push(minAmount);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const depositsQuery = `SELECT * FROM deposits ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    const countQuery = `SELECT COUNT(*) as count FROM deposits ${whereClause.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) - 2}`)}`;

    const depositsResult = await pool.query(depositsQuery, queryParams);
    const countResult = await pool.query(countQuery, countParams);
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
