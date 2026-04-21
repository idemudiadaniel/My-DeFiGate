import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testSchema() {
  const client = await pool.connect();

  try {
    console.log('🔄 Testing schema.sql file...');

    // Read the schema file
    const schemaPath = path.join(__dirname, '../migrate/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    // Split into individual statements (basic approach)
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      try {
        await client.query(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Ignore "already exists" errors for IF NOT EXISTS statements
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${statement.substring(0, 50)}...`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Schema validation completed successfully!');

    // Verify tables exist
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'balances', 'wallets', 'transactions', 'transfers')
      ORDER BY table_name;
    `);

    console.log('📋 Tables created/verified:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Schema test failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testSchema();