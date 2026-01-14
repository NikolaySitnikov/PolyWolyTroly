import pg from "pg";
import { config } from "../config/index.js";

const { Pool } = pg;

const pool = new Pool({ connectionString: config.database.url });

export type WalletSource = 'deposit_tracking' | 'detection';

export interface Wallet {
  address: string;
  firstSeenAt: Date;
  firstDepositAmount: number;
  totalDeposited: number;
  depositCount: number;
  isNotified: boolean;
  source: WalletSource;
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

  // Check if wallet is flagged as a market maker
  async isMarketMaker(address: string): Promise<boolean> {
    const result = await pool.query(
      "SELECT is_market_maker FROM wallets WHERE address = $1",
      [address.toLowerCase()]
    );
    return result.rows[0]?.is_market_maker === true;
  },

  // Create new wallet record
  // source: 'deposit_tracking' (default) or 'detection' (added via insider detection)
  async createWallet(
    address: string,
    depositAmount: number,
    txHash: string,
    source: 'deposit_tracking' | 'detection' = 'deposit_tracking'
  ): Promise<void> {
    await pool.query(
      `INSERT INTO wallets (address, first_deposit_amount, first_deposit_tx, total_deposited, deposit_count, source)
       VALUES ($1, $2, $3, $2, 1, $4)
       ON CONFLICT (address) DO NOTHING`,
      [address.toLowerCase(), depositAmount, txHash, source]
    );
  },

  // Record a deposit and prune old deposits if limit exceeded
  async recordDeposit(
    txHash: string,
    walletAddress: string,
    amount: number,
    blockNumber: bigint
  ): Promise<number | null> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO deposits (tx_hash, wallet_address, amount, block_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [txHash, walletAddress.toLowerCase(), amount, blockNumber.toString()]
      );

      // Update wallet totals
      await client.query(
        `UPDATE wallets
         SET total_deposited = total_deposited + $1,
             deposit_count = deposit_count + 1,
             updated_at = NOW()
         WHERE address = $2`,
        [amount, walletAddress.toLowerCase()]
      );

      // Prune oldest deposits beyond the limit (keeps most recent maxAlerts)
      await client.query(
        `DELETE FROM deposits
         WHERE id IN (
           SELECT id FROM deposits
           ORDER BY id DESC
           OFFSET $1
         )`,
        [config.app.maxAlerts]
      );

      await client.query("COMMIT");
      return result.rows[0]?.id;
    } catch (error: any) {
      await client.query("ROLLBACK");
      // Duplicate tx_hash - already processed
      if (error.code === "23505") return null;
      throw error;
    } finally {
      client.release();
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
    newWhalesToday: number;
  }> {
    // Get current whale count (excluding market makers)
    const whaleCountResult = await pool.query("SELECT COUNT(*) as count FROM wallets WHERE is_market_maker = FALSE");
    const whaleCount = parseInt(whaleCountResult.rows[0]?.count || "0", 10);

    // Get whale count from 24 hours ago (for trend, excluding market makers)
    const whaleCount24hAgoResult = await pool.query(
      "SELECT COUNT(*) as count FROM wallets WHERE is_market_maker = FALSE AND created_at < NOW() - INTERVAL '24 hours'"
    );
    const whaleCount24hAgo = parseInt(whaleCount24hAgoResult.rows[0]?.count || "0", 10);

    // Calculate whale trend: % change over last 24 hours
    const whaleCountTrend = whaleCount24hAgo > 0
      ? Math.round(((whaleCount - whaleCount24hAgo) / whaleCount24hAgo) * 100 * 100) / 100
      : 0;

    // Get total volume (all time)
    const totalVolumeResult = await pool.query("SELECT SUM(amount) as sum FROM deposits");
    const totalVolume = parseInt(totalVolumeResult.rows[0]?.sum || "0", 10);

    // Get volume from 24 hours ago (for trend)
    const volume24hAgoResult = await pool.query(
      "SELECT SUM(amount) as sum FROM deposits WHERE created_at < NOW() - INTERVAL '24 hours'"
    );
    const volume24hAgo = parseInt(volume24hAgoResult.rows[0]?.sum || "0", 10);

    // Calculate volume trend: % change over last 24 hours
    const totalVolumeTrend = volume24hAgo > 0
      ? Math.round(((totalVolume - volume24hAgo) / volume24hAgo) * 100 * 100) / 100
      : 0;

    // Get alerts today (deposits in last 24 hours)
    const alertsTodayResult = await pool.query(
      "SELECT COUNT(*) as count FROM deposits WHERE created_at >= NOW() - INTERVAL '24 hours'"
    );
    const alertsToday = parseInt(alertsTodayResult.rows[0]?.count || "0", 10);

    // Get new whales today (last 24 hours, excluding market makers)
    const newWhalesResult = await pool.query(
      "SELECT COUNT(*) as count FROM wallets WHERE is_market_maker = FALSE AND created_at >= NOW() - INTERVAL '24 hours'"
    );
    const newWhalesToday = parseInt(newWhalesResult.rows[0]?.count || "0", 10);

    return {
      whaleCount,
      whaleCountTrend,
      totalVolume,
      totalVolumeTrend,
      alertsToday,
      newWhalesToday,
    };
  },

  // Get all wallets with pagination and sorting
  async getAllWallets(
    page: number,
    limit: number,
    sortBy: 'total_deposited' | 'deposit_count' | 'first_seen_at' | 'pnl' = 'total_deposited',
    sortDir: 'asc' | 'desc' = 'desc'
  ): Promise<{
    wallets: Wallet[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    // Map frontend field names to database column names
    const validSortFields = ['total_deposited', 'deposit_count', 'first_seen_at', 'pnl'];
    const validSortDirs = ['asc', 'desc'];

    // Validate and sanitize sort parameters to prevent SQL injection
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'total_deposited';
    const safeSortDir = validSortDirs.includes(sortDir) ? sortDir.toUpperCase() : 'DESC';

    // Handle NULL values in sort - put NULLs last for pnl sorting
    const nullsLast = safeSortBy === 'pnl' ? 'NULLS LAST' : '';

    const walletsResult = await pool.query(
      `SELECT * FROM wallets WHERE is_market_maker = FALSE ORDER BY ${safeSortBy} ${safeSortDir} ${nullsLast} LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) as count FROM wallets WHERE is_market_maker = FALSE");
    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    return {
      wallets: walletsResult.rows,
      total,
      page,
      limit,
    };
  },

  // Get recent deposits with pagination, optional filters, and sorting
  async getRecentDeposits(
    page: number,
    limit: number,
    walletAddress?: string,
    minAmount?: number,
    sortBy: 'amount' | 'created_at' | 'type' = 'created_at',
    sortDir: 'asc' | 'desc' = 'desc'
  ): Promise<{
    deposits: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    // Validate and sanitize sort parameters to prevent SQL injection
    const validSortFields = ['amount', 'created_at', 'type'];
    const validSortDirs = ['asc', 'desc'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortDir = validSortDirs.includes(sortDir) ? sortDir.toUpperCase() : 'DESC';

    // Build WHERE clause dynamically based on filters
    const conditions: string[] = [];
    const queryParams: any[] = [limit, offset];
    const countParams: any[] = [];
    let paramIndex = 3;

    if (walletAddress) {
      conditions.push(`wallet_address = $${paramIndex}`);
      queryParams.push(walletAddress.toLowerCase());
      countParams.push(walletAddress.toLowerCase());
      paramIndex++;
    }

    if (minAmount !== undefined && minAmount > 0) {
      conditions.push(`amount >= $${paramIndex}`);
      queryParams.push(minAmount);
      countParams.push(minAmount);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const depositsQuery = `SELECT * FROM deposits ${whereClause} ORDER BY ${safeSortBy} ${safeSortDir} LIMIT $1 OFFSET $2`;
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

  // Create wallet with full historical deposit data (bulk insert)
  // Used when a new whale is detected to backfill their complete deposit history
  // source: 'deposit_tracking' (default) or 'detection' (added via insider detection)
  async createWalletWithHistory(
    address: string,
    deposits: Array<{
      txHash: string;
      amount: number;
      blockNumber: bigint;
      timestamp: number;
    }>,
    source: 'deposit_tracking' | 'detection' = 'deposit_tracking'
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const normalizedAddress = address.toLowerCase();

      // Calculate totals from deposits
      const totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0);
      const depositCount = deposits.length;
      const firstDeposit = deposits[0] || null;
      const firstDepositAmount = firstDeposit?.amount || 0;
      const firstDepositTx = firstDeposit?.txHash || null;
      const firstSeenAt = firstDeposit
        ? new Date(firstDeposit.timestamp * 1000)
        : new Date();

      // Insert wallet with pre-calculated totals
      await client.query(
        `INSERT INTO wallets (address, first_deposit_amount, first_deposit_tx, total_deposited, deposit_count, first_seen_at, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (address) DO NOTHING`,
        [normalizedAddress, firstDepositAmount, firstDepositTx, totalDeposited, depositCount, firstSeenAt, source]
      );

      // Bulk insert all deposits if we have any
      if (deposits.length > 0) {
        // Build bulk insert query with parameterized values
        const values: any[] = [];
        const valuePlaceholders: string[] = [];

        deposits.forEach((deposit, index) => {
          const offset = index * 4;
          valuePlaceholders.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`
          );
          values.push(
            deposit.txHash,
            normalizedAddress,
            deposit.amount,
            deposit.blockNumber.toString()
          );
        });

        await client.query(
          `INSERT INTO deposits (tx_hash, wallet_address, amount, block_number)
           VALUES ${valuePlaceholders.join(", ")}
           ON CONFLICT (tx_hash) DO NOTHING`,
          values
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Get whale of the day (top depositor in last 24 hours)
  async getWhaleOfTheDay(): Promise<{
    address: string;
    totalToday: number;
    depositCount: number;
    largestDeposit: number;
  } | null> {
    const result = await pool.query(`
      SELECT
        wallet_address as address,
        SUM(amount) as total_today,
        COUNT(*) as deposit_count,
        MAX(amount) as largest_deposit
      FROM deposits
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY wallet_address
      ORDER BY total_today DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      address: row.address,
      totalToday: parseFloat(row.total_today),
      depositCount: parseInt(row.deposit_count, 10),
      largestDeposit: parseFloat(row.largest_deposit),
    };
  },

  // Update trading metrics for a wallet (called by cache warmer)
  async updateTradingMetrics(
    address: string,
    metrics: {
      pnl: number;
      pnl7d: number;
      pnl30d: number;
      winRate: number;
      portfolioValue: number;
      totalTrades: number;
      lastActivityAt: string | null;
      isLive: boolean;
    }
  ): Promise<void> {
    await pool.query(
      `UPDATE wallets SET
        pnl = $2,
        pnl_7d = $3,
        pnl_30d = $4,
        win_rate = $5,
        portfolio_value = $6,
        total_trades = $7,
        last_activity_at = $8,
        is_live = $9,
        trading_data_updated_at = NOW(),
        updated_at = NOW()
      WHERE address = $1`,
      [
        address.toLowerCase(),
        metrics.pnl,
        metrics.pnl7d,
        metrics.pnl30d,
        metrics.winRate,
        metrics.portfolioValue,
        metrics.totalTrades,
        metrics.lastActivityAt,
        metrics.isLive,
      ]
    );
  },

  // Batch update trading metrics for multiple wallets (more efficient)
  async batchUpdateTradingMetrics(
    updates: Array<{
      address: string;
      pnl: number;
      pnl7d: number;
      pnl30d: number;
      winRate: number;
      portfolioValue: number;
      totalTrades: number;
      lastActivityAt: string | null;
      isLive: boolean;
    }>
  ): Promise<void> {
    if (updates.length === 0) return;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const u of updates) {
        await client.query(
          `UPDATE wallets SET
            pnl = $2,
            pnl_7d = $3,
            pnl_30d = $4,
            win_rate = $5,
            portfolio_value = $6,
            total_trades = $7,
            last_activity_at = $8,
            is_live = $9,
            trading_data_updated_at = NOW(),
            updated_at = NOW()
          WHERE address = $1`,
          [
            u.address.toLowerCase(),
            u.pnl,
            u.pnl7d,
            u.pnl30d,
            u.winRate,
            u.portfolioValue,
            u.totalTrades,
            u.lastActivityAt,
            u.isLive,
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Get wallets with trading-based filters (uses cached DB metrics)
  async getFilteredWallets(
    page: number,
    limit: number,
    sortBy: 'total_deposited' | 'deposit_count' | 'first_seen_at' | 'pnl' = 'total_deposited',
    sortDir: 'asc' | 'desc' = 'desc',
    filters: ('profitable' | 'losing' | 'live')[] = []
  ): Promise<{
    wallets: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;

    // Build WHERE clause based on filters
    const conditions: string[] = ['is_market_maker = FALSE'];

    // Filters require trading data to be present (pnl IS NOT NULL)
    if (filters.length > 0) {
      conditions.push('pnl IS NOT NULL');
    }

    if (filters.includes('profitable')) {
      conditions.push('pnl > 0');
    }
    if (filters.includes('losing')) {
      conditions.push('pnl < 0');
    }
    if (filters.includes('live')) {
      conditions.push('is_live = TRUE');
    }

    const whereClause = conditions.join(' AND ');

    // Map sort field to column name
    const sortColumns: Record<string, string> = {
      total_deposited: 'total_deposited',
      deposit_count: 'deposit_count',
      first_seen_at: 'first_seen_at',
      pnl: 'pnl',
    };
    const safeSortBy = sortColumns[sortBy] || 'total_deposited';
    const safeSortDir = sortDir === 'asc' ? 'ASC' : 'DESC';

    // Handle NULL values in sort - put NULLs last
    const nullsLast = sortBy === 'pnl' ? 'NULLS LAST' : '';

    const walletsResult = await pool.query(
      `SELECT * FROM wallets
       WHERE ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortDir} ${nullsLast}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM wallets WHERE ${whereClause}`
    );
    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    return {
      wallets: walletsResult.rows,
      total,
      page,
      limit,
    };
  },

  // Get count of wallets that have trading data cached
  async getWalletsWithTradingDataCount(): Promise<number> {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM wallets WHERE pnl IS NOT NULL AND is_market_maker = FALSE"
    );
    return parseInt(result.rows[0]?.count || "0", 10);
  },

  // Get wallets that need trading data refresh (oldest first)
  async getWalletsNeedingTradingRefresh(
    limit: number,
    maxAgeMinutes: number = 5
  ): Promise<string[]> {
    const result = await pool.query(
      `SELECT address FROM wallets
       WHERE is_market_maker = FALSE
         AND (trading_data_updated_at IS NULL
              OR trading_data_updated_at < NOW() - INTERVAL '${maxAgeMinutes} minutes')
       ORDER BY trading_data_updated_at ASC NULLS FIRST
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((r) => r.address);
  },

  // Run arbitrary query (for migrations/admin tasks)
  async runQuery(sql: string): Promise<void> {
    await pool.query(sql);
  },

  // Close pool (for cleanup)
  async close(): Promise<void> {
    await pool.end();
  },
};
