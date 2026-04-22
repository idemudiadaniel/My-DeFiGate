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
  if (!isPrivyEnabled) return null;

  try {
    const r = await axios.post(
      `${PRIVY_BASE}/v1/wallets`,
      { chain_type: chainType },
      { headers: privyHeaders(), timeout: 5000 }
    );

    return r.data;
  } catch (err) {
    console.error("Privy wallet creation failed:", err?.message);
    return null;
  }
}

/* -------------------------
   DB HELPERS
-------------------------- */

async function getWalletByUserIdAndChain(userId, chainType) {
  const result = await pool.query(
    `SELECT * FROM wallets WHERE user_id = $1 AND chain = $2 LIMIT 1`,
    [userId, chainType]
  );

  return result.rows[0] || null;
}

async function saveWallet(userId, privyWallet, chainType) {
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
}

/* -------------------------
   MAIN SAFE FUNCTION
-------------------------- */

export async function ensureUserWallet(
  userId,
  email,
  chainType = "solana"
) {
  const key = `${userId}:${chainType}`;

  if (!userId || !email) {
    return {
      status: "skipped",
      reason: "missing_user",
    };
  }

  // 1. Check DB first
  try {
    const existing = await getWalletByUserIdAndChain(userId, chainType);
    if (existing) {
      return { ...existing, status: "connected" };
    }
  } catch (err) {
    console.error("DB wallet lookup failed:", err?.message);
  }

  // 2. Memory cache
  if (inMemoryWallets.has(key)) {
    return inMemoryWallets.get(key);
  }

  // 3. Privy disabled → safe fallback
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

  // 4. Try Privy (non-blocking)
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

  // 5. Save real wallet
  try {
    const saved = await saveWallet(userId, privyWallet, chainType);

    const wallet = {
      ...saved,
      status: "connected",
    };

    inMemoryWallets.set(key, wallet);
    return wallet;
  } catch (err) {
    console.error("Wallet DB save failed:", err?.message);

    return {
      id: key,
      provider: "privy",
      address: privyWallet?.accounts?.[0]?.address || null,
      chain: chainType,
      status: "partial",
    };
  }
}
