import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { sequelize } from "./models/index.js";

import rampRoutes from "./routes/ramp.js";
import walletRoutes from "./routes/wallet.js";
import userRoutes from "./routes/user.js";
import transferRoutes from "./routes/transfer.js";
import testRoutes from "./routes/test.js";

const app = express();

// ======================
// ENV CHECK
// ======================
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required");
  process.exit(1);
}

// ======================
// MIDDLEWARE
// ======================
app.use(cors());
app.use(bodyParser.json());

// ======================
// API ROUTES
// ======================
app.use("/api/mento", rampRoutes);
app.use("/api/ramp", rampRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/user", userRoutes);
app.use("/api/transfer", transferRoutes);
app.use("/api/test", testRoutes);

// ======================
// HEALTH CHECK
// ======================
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "DeFiGate API",
    timestamp: new Date().toISOString()
  });
});

// ======================
// GLOBAL ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  res.status(500).json({
    ok: false,
    message: err.message || "Internal server error"
  });
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync({ alter: process.env.NODE_ENV === "development" });
    console.log("✅ Models synced");

    await import("./services/depositDetector.js");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 API running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
})();