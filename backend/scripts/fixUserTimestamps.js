import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running migration: Fix timestamp columns for users table');

    // Check current timestamp columns
    const checkTimestampsQuery = `
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('created_at', 'updated_at');
    `;

    const timestampsResult = await client.query(checkTimestampsQuery);
    console.log('Current timestamp columns:');
    timestampsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}, default: ${row.column_default}, nullable: ${row.is_nullable}`);
    });

    // Add or fix timestamp columns
    const addTimestampsQuery = `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `;

    await client.query(addTimestampsQuery);
    console.log('✅ Timestamp columns added/fixed');

    // Verify the changes
    const verifyResult = await client.query(checkTimestampsQuery);
    console.log('Updated timestamp columns:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}, default: ${row.column_default}, nullable: ${row.is_nullable}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();