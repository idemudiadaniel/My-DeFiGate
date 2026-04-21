import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const express = (await import("express")).default;
const cors = (await import("cors")).default;
const bodyParser = (await import("body-parser")).default;
const { sequelize } = await import("./models/index.js");
const rampRoutes = (await import("./routes/ramp.js")).default;
const walletRoutes = (await import("./routes/wallet.js")).default;
const userRoutes = (await import("./routes/user.js")).default;
const transferRoutes = (await import("./routes/transfer.js")).default;
const testRoutes = (await import("./routes/test.js")).default;

const app = express();

// Require Supabase for all environments
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required. Please set it to your Supabase PostgreSQL connection string.");
  process.exit(1);
}

app.use(cors());
app.use(bodyParser.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// API Routes
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

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Supabase PostgreSQL database connected");
    await sequelize.sync({ alter: process.env.NODE_ENV === "development" });
    console.log("✅ Sequelize models synchronized with Supabase");
    await import("./services/depositDetector.js");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`DeFiGate server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Supabase connection failed:", err.message);
    console.error("💡 Make sure your DATABASE_URL is correct and Supabase is accessible");
    process.exit(1);
  }
})();
