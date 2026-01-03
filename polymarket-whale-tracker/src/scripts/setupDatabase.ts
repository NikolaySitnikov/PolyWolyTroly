import pg from "pg";
import { config } from "../config/index.js";

const { Pool } = pg;

export async function setupDatabase() {
  const pool = new Pool({ connectionString: config.database.url });

  const schema = `
    -- Wallets table: tracks all wallets we've seen
    CREATE TABLE IF NOT EXISTS wallets (
      address VARCHAR(42) PRIMARY KEY,
      first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      first_deposit_amount DECIMAL(20, 6),
      first_deposit_tx VARCHAR(66),
      total_deposited DECIMAL(20, 6) DEFAULT 0,
      deposit_count INTEGER DEFAULT 0,
      is_notified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Deposits table: tracks all deposits
    CREATE TABLE IF NOT EXISTS deposits (
      id SERIAL PRIMARY KEY,
      tx_hash VARCHAR(66) UNIQUE NOT NULL,
      wallet_address VARCHAR(42) NOT NULL REFERENCES wallets(address),
      amount DECIMAL(20, 6) NOT NULL,
      block_number BIGINT NOT NULL,
      block_timestamp TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Notifications table: tracks sent alerts
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) NOT NULL,
      deposit_id INTEGER REFERENCES deposits(id),
      notification_type VARCHAR(50) NOT NULL,
      message TEXT,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      success BOOLEAN DEFAULT TRUE,
      error_message TEXT
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_wallets_first_seen ON wallets(first_seen_at);
    CREATE INDEX IF NOT EXISTS idx_deposits_wallet ON deposits(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_deposits_block ON deposits(block_number);
  `;

  try {
    await pool.query(schema);
    console.log("✅ Database schema created successfully!");
  } catch (error) {
    console.error("❌ Error creating schema:", error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
setupDatabase();
