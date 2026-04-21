import dns from "dns";
import dotenv from "dotenv";
import pool from "../db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Force IPv4 DNS resolution
dns.setDefaultResultOrder("ipv4first");

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log("🔄 Running user schema migration...");

    const sql = fs.readFileSync(path.join(__dirname, "../migrate/005_ensure_user_schema_complete.sql"), 'utf8');
    const statements = sql.split(';').filter(s => s.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim().substring(0, 60)}...`);
        await pool.query(statement);
      }
    }

    console.log("✅ User schema migration completed successfully");
    process.exit(0);

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();