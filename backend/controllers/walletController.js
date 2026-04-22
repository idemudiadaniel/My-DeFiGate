import axios from "axios";
import dotenv from "dotenv";
import pool from "../db.js";

dotenv.config();

const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const PRIVY_BASE = "https://api.privy.io";

const inMemoryWallets = new Map();
const isPrivyEnabled = Boolean(PRIVY_APP_ID && PRIVY_APP_SECRET);

/* -------------------------
   PRIVY HELPERS
-------------------------- */

function privyHeaders() {
  const encoded = Buffer.from(
    `${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`
  ).toString("base64");

  return {
    Authorization: `Basic ${encoded}`,
    "privy-app-id": PRIVY_APP_ID,
    "Content-Type": "application/json",
  };
}

async function createPrivyWallet(chainType = "solana") {
  try {
    const r = await axios.post(
      `${PRIVY_BASE}/v1/wallets`,
      { chain_type: chainType },
      { headers: privyHeaders(), timeout: 8000 }
    );

    return r.data;
  } catch (err) {
    console.error("Privy wallet creation failed:", err?.message);
    return null; // IMPORTANT: never throw
  }
}

/* -------------------------
   DB HELPERS
-------------------------- */

async function getWalletByUserIdAndChain(userId, chainType) {
  try {
    const result = await pool.query(
      `SELECT * FROM wallets WHERE user_id = $1 AND chain = $2 LIMIT 1`,
      [userId, chainType]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error("DB get wallet error:", err.message);
    return null;
  }
}

async function saveWallet(userId, privyWallet, chainType) {
  try {
    const providerWalletId = privyWallet?.id || null;
    const address =
      privyWallet?.accounts?.[0]?.address ||
      privyWallet?.address ||
      null;

    const result = await pool.query(
      `INSERT INTO wallets (user_id, provider, provider_wallet_id, address, chain)
       VALUES ($1, 'privy', $2, $3, $4)
       RETURNING *`,
      [userId, providerWalletId, address, chainType]
    );

    await pool.query(
      `UPDATE users SET privy_wallet_id = $1 WHERE id = $2`,
      [providerWalletId, userId]
    );

    return result.rows[0];
  } catch (err) {
    console.error("DB save wallet error:", err.message);
    return null;
  }
}

/* -------------------------
   CORE FUNCTION
-------------------------- */

export async function ensureUserWallet(userId, email, chainType = "solana") {
  const key = `${userId}:${chainType}`;

  if (!userId) {
    return { status: "error", message: "Missing userId" };
  }

  // 1. DB check
  const existing = await getWalletByUserIdAndChain(userId, chainType);
  if (existing) return { ...existing, status: "connected" };

  // 2. cache
  if (inMemoryWallets.has(key)) {
    return inMemoryWallets.get(key);
  }

  // 3. fallback if Privy off
  if (!isPrivyEnabled) {
    const wallet = {
      id: key,
      user_id: userId,
      provider: "local",
      address: `sol_${userId.slice(0, 8)}`,
      chain: chainType,
      status: "mock",
    };

    inMemoryWallets.set(key, wallet);
    return wallet;
  }

  // 4. try Privy safely
  const privyWallet = await createPrivyWallet(chainType);

  if (!privyWallet) {
    const fallback = {
      id: key,
      user_id: userId,
      provider: "local",
      address: `sol_${userId.slice(0, 8)}`,
      chain: chainType,
      status: "degraded",
    };

    inMemoryWallets.set(key, fallback);
    return fallback;
  }

  // 5. save
  const saved = await saveWallet(userId, privyWallet, chainType);

  const finalWallet = {
    ...(saved || {}),
    status: "connected",
  };

  inMemoryWallets.set(key, finalWallet);
  return finalWallet;
}

/* -------------------------
   CONTROLLERS (SAFE EXPORTS)
-------------------------- */

export const createEmbeddedWallet = async (req, res) => {
  try {
    const wallet = await ensureUserWallet(
      req.user?.id || req.body.userId,
      req.user?.email || req.body.email,
      req.body.chainType || "solana"
    );

    return res.json({ ok: true, data: wallet });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
};

export const sendTxToAddress = async (req, res) => {
  return res.status(501).json({
    ok: false,
    error: "sendTxToAddress not fully implemented in this build",
  });
};

export const getWallet = async (req, res) => {
  return res.status(501).json({
    ok: false,
    error: "getWallet not implemented in this build",
  });
};
