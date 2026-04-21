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
    console.log('🔄 Running migration: Fix nullable columns for users table');

    // Check current nullable status
    const checkColumnsQuery = `
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('wallet_address', 'name', 'phone', 'company', 'email_verification_token', 'email_verified_at', 'privy_wallet_id');
    `;

    const columnsResult = await client.query(checkColumnsQuery);
    console.log('Current nullable status:');
    columnsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.is_nullable}`);
    });

    // Make columns nullable as per model definition
    const alterColumnsQuery = `
      ALTER TABLE users
      ALTER COLUMN wallet_address DROP NOT NULL,
      ALTER COLUMN name DROP NOT NULL,
      ALTER COLUMN phone DROP NOT NULL,
      ALTER COLUMN company DROP NOT NULL,
      ALTER COLUMN email_verification_token DROP NOT NULL,
      ALTER COLUMN email_verified_at DROP NOT NULL,
      ALTER COLUMN privy_wallet_id DROP NOT NULL;
    `;

    await client.query(alterColumnsQuery);
    console.log('✅ Columns made nullable');

    // Verify the changes
    const verifyResult = await client.query(checkColumnsQuery);
    console.log('Updated nullable status:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.is_nullable}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();