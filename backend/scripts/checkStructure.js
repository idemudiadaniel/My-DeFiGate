import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTableStructure() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking users table structure...\n');

    const result = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('Users table columns:');
    result.rows.forEach(row => {
      const defaultVal = row.column_default ? row.column_default.replace('::timestamp with time zone', '') : 'null';
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable}) default: ${defaultVal}`);
    });

    console.log('\n✅ Table structure verification complete!');

  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableStructure();