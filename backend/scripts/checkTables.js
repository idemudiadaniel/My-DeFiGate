import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTables() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking all tables in public schema...\n');

    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log('All tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.tablename}`);
    });

    console.log('\n🔍 Checking our application tables...\n');

    // Check if our tables have the expected structure
    const appTables = ['users', 'balances', 'wallets', 'transactions', 'transfers'];

    for (const tableName of appTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`✅ ${tableName}: ${countResult.rows[0].count} rows`);
      } catch (error) {
        console.log(`❌ ${tableName}: Table not accessible - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();