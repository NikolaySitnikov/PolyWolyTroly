import { config } from "../config";
import pg from "pg";
import Redis from "ioredis";

async function clearAllData() {
  console.log("🗑️  Clearing all data...\n");

  // Clear PostgreSQL
  console.log("📦 Clearing PostgreSQL database...");
  const pool = new pg.Pool({ connectionString: config.database.url });

  try {
    // Delete in order due to foreign key constraints
    await pool.query("DELETE FROM notifications");
    console.log("   ✓ Cleared notifications table");

    await pool.query("DELETE FROM deposits");
    console.log("   ✓ Cleared deposits table");

    await pool.query("DELETE FROM wallets");
    console.log("   ✓ Cleared wallets table");
  } finally {
    await pool.end();
  }

  // Clear Redis
  console.log("\n🔴 Clearing Redis cache...");
  const redis = new Redis(config.redis.url);

  try {
    await redis.flushdb();
    console.log("   ✓ Flushed Redis database");
  } finally {
    redis.disconnect();
  }

  console.log("\n✅ All data cleared! Starting fresh.");
}

clearAllData().catch(console.error);
