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
    console.log('🔄 Running migration: Fix UUID id column for users table');

    // First, check if the id column exists and its type
    const checkColumnQuery = `
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id';
    `;

    const columnResult = await client.query(checkColumnQuery);
    console.log('Current id column info:', columnResult.rows[0]);

    // Alter the id column to be UUID with default
    const alterIdQuery = `
      ALTER TABLE users
      ALTER COLUMN id TYPE UUID USING id::UUID,
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
    `;

    await client.query(alterIdQuery);
    console.log('✅ id column altered to UUID with default');

    // Verify the change
    const verifyResult = await client.query(checkColumnQuery);
    console.log('Updated id column info:', verifyResult.rows[0]);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();