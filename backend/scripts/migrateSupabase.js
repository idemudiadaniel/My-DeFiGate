import dns from "dns";
import dotenv from "dotenv";
import pkg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Force IPv4 DNS resolution
dns.setDefaultResultOrder("ipv4first");

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  let client;
  try {
    console.log('🔄 Running user schema migration...');

    client = await pool.connect();

    // Read the migration file
    const sql = fs.readFileSync(path.join(__dirname, '../migrate/005_ensure_user_schema_complete.sql'), 'utf8');

    // Split into individual statements
    const statements = sql.split(';').filter(s => s.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim().substring(0, 60)}...`);

        await client.query(statement.trim());
        console.log('✅ Statement executed');
      }
    }

    console.log('🎉 Migration completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

runMigration();