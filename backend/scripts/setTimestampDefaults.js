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
    console.log('🔄 Running migration: Set defaults for timestamp columns');

    // Set default values for timestamp columns
    const setDefaultsQuery = `
      ALTER TABLE users
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();
    `;

    await client.query(setDefaultsQuery);
    console.log('✅ Default values set for timestamp columns');

    // Check the updated columns
    const checkQuery = `
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('created_at', 'updated_at');
    `;

    const result = await client.query(checkQuery);
    console.log('Final timestamp columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: default=${row.column_default}, nullable=${row.is_nullable}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();