import pg from "pg";
import { config } from "../config/index.js";

const { Pool } = pg;

/**
 * Migration script to enable alert pruning:
 * 1. Updates notifications FK constraint to ON DELETE SET NULL
 * 2. Adds index on deposits.id for efficient pruning
 * 3. Prunes existing deposits to maxAlerts limit
 */
export async function migrateAlertLimit() {
  const pool = new Pool({ connectionString: config.database.url });

  try {
    console.log("🔄 Starting alert limit migration...\n");

    // Step 1: Drop the existing FK constraint and recreate with ON DELETE SET NULL
    console.log("1. Updating notifications FK constraint...");
    await pool.query(`
      ALTER TABLE notifications
      DROP CONSTRAINT IF EXISTS notifications_deposit_id_fkey;
    `);
    await pool.query(`
      ALTER TABLE notifications
      ADD CONSTRAINT notifications_deposit_id_fkey
      FOREIGN KEY (deposit_id) REFERENCES deposits(id) ON DELETE SET NULL;
    `);
    console.log("   ✅ FK constraint updated to ON DELETE SET NULL\n");

    // Step 2: Add index on deposits.id if not exists
    console.log("2. Adding index on deposits.id...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deposits_id ON deposits(id);
    `);
    console.log("   ✅ Index created\n");

    // Step 3: Get current count
    const countResult = await pool.query("SELECT COUNT(*) as count FROM deposits");
    const currentCount = parseInt(countResult.rows[0].count, 10);
    console.log(`3. Current deposit count: ${currentCount.toLocaleString()}`);
    console.log(`   Max alerts limit: ${config.app.maxAlerts.toLocaleString()}\n`);

    // Step 4: Prune if over limit
    if (currentCount > config.app.maxAlerts) {
      const toDelete = currentCount - config.app.maxAlerts;
      console.log(`4. Pruning ${toDelete.toLocaleString()} oldest deposits...`);

      const deleteResult = await pool.query(`
        DELETE FROM deposits
        WHERE id IN (
          SELECT id FROM deposits
          ORDER BY id DESC
          OFFSET $1
        )
      `, [config.app.maxAlerts]);

      console.log(`   ✅ Deleted ${deleteResult.rowCount?.toLocaleString()} deposits\n`);
    } else {
      console.log("4. No pruning needed - within limit\n");
    }

    // Verify final count
    const finalResult = await pool.query("SELECT COUNT(*) as count FROM deposits");
    const finalCount = parseInt(finalResult.rows[0].count, 10);
    console.log(`✅ Migration complete! Final deposit count: ${finalCount.toLocaleString()}`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
migrateAlertLimit();
