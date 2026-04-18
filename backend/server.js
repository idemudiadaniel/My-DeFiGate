import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sequelize } from "./models/index.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Require PostgreSQL for all environments
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required. Please set it to a PostgreSQL connection string.");
  process.exit(1);
}

// Initialize Sequelize
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL database connected");
    await sequelize.sync({ alter: process.env.NODE_ENV === "development" });
    console.log("✅ Sequelize models synchronized");
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
    process.exit(1);
  }
})();

app.use(cors());
app.use(bodyParser.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// API Routes
import rampRoutes from "./routes/ramp.js";
import walletRoutes from "./routes/wallet.js";
import userRoutes from "./routes/user.js";
import transferRoutes from "./routes/transfer.js";
import testRoutes from "./routes/test.js";
import './services/depositDetector.js';
// Mount under /mento for backward compat and /ramp for new routes
app.use("/mento", rampRoutes);
app.use("/ramp", rampRoutes);
app.use("/wallet", walletRoutes);
app.use("/user", userRoutes);
app.use("/transfer", transferRoutes);
app.use("/test", testRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "DeFiGate", timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ ok: false, message: err.message || 'Internal server error' });
});

// Fallback: serve frontend for any unmatched route (SPA support)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DeFiGate server running on port ${PORT}`);
});
