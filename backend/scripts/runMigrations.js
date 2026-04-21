import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../db.js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log("🔄 Running database migrations...");

    // Get all migration files
    const migrateDir = path.join(__dirname, "../migrate");
    const files = fs.readdirSync(migrateDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure proper order

    console.log(`Found ${files.length} migration files`);

    for (const file of files) {
      console.log(`📄 Running migration: ${file}`);
      const filePath = path.join(migrateDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Split by semicolon and execute each statement
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }

      console.log(`✅ Migration ${file} completed`);
    }

    console.log("🎉 All migrations completed successfully");
    process.exit(0);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export default runMigrations;
