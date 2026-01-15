/**
 * Export schema from Supabase for local PostgreSQL setup
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Get all table definitions
  const result = await pool.query(`
    SELECT
      table_name,
      column_name,
      data_type,
      column_default,
      is_nullable,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  let currentTable = '';
  const createStatements: string[] = [];
  let currentCols: string[] = [];

  for (const row of result.rows) {
    if (row.table_name !== currentTable) {
      if (currentTable && currentCols.length > 0) {
        createStatements.push(`CREATE TABLE IF NOT EXISTS ${currentTable} (\n  ${currentCols.join(',\n  ')}\n);`);
      }
      currentTable = row.table_name;
      currentCols = [];
    }

    let dataType = row.data_type.toUpperCase();
    if (dataType === 'CHARACTER VARYING' && row.character_maximum_length) {
      dataType = `VARCHAR(${row.character_maximum_length})`;
    } else if (dataType === 'CHARACTER VARYING') {
      dataType = 'TEXT';
    } else if (dataType === 'TIMESTAMP WITH TIME ZONE') {
      dataType = 'TIMESTAMPTZ';
    } else if (dataType === 'TIMESTAMP WITHOUT TIME ZONE') {
      dataType = 'TIMESTAMP';
    }

    let colDef = `${row.column_name} ${dataType}`;

    if (row.column_default) {
      if (row.column_default.includes('nextval')) {
        // It's a serial column
        if (dataType === 'BIGINT') {
          colDef = `${row.column_name} BIGSERIAL`;
        } else {
          colDef = `${row.column_name} SERIAL`;
        }
      } else if (row.column_default === 'now()' || row.column_default.includes('CURRENT_TIMESTAMP')) {
        colDef += ' DEFAULT NOW()';
      } else if (row.column_default === 'true' || row.column_default === 'false') {
        colDef += ` DEFAULT ${row.column_default.toUpperCase()}`;
      } else if (!row.column_default.includes('::')) {
        // Simple default value
        colDef += ` DEFAULT ${row.column_default}`;
      }
    }

    if (row.is_nullable === 'NO' && !colDef.includes('SERIAL')) {
      colDef += ' NOT NULL';
    }

    currentCols.push(colDef);
  }

  if (currentTable && currentCols.length > 0) {
    createStatements.push(`CREATE TABLE IF NOT EXISTS ${currentTable} (\n  ${currentCols.join(',\n  ')}\n);`);
  }

  // Output the schema
  console.log('-- Schema exported from Supabase');
  console.log('-- Generated at:', new Date().toISOString());
  console.log();
  console.log(createStatements.join('\n\n'));

  await pool.end();
}

main().catch(console.error);
