import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../db.js";
import { generateToken } from "../middleware/auth.js";
import { ensureUserWallet } from "./walletController.js";

const useInMemoryAuth = !process.env.DATABASE_URL;
export const inMemoryUsers = new Map();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function getWalletForUser(userId) {
  const result = await pool.query(
    `SELECT id, user_id, provider, provider_wallet_id, address, chain, created_at
     FROM wallets WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

export const signup = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  console.log('signup called', { normalizedEmail, useInMemoryAuth });

  if (!normalizedEmail || !password || password.length < 6) {
    return res
      .status(400)
      .json({ ok: false, error: "Email and password (min 6 chars) are required" });
  }

  // Try DB first if configured, fall back to in-memory
  let useDB = Boolean(process.env.DATABASE_URL);
  let dbError = null;

  if (useDB) {
    try {
      const hash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, created_at`,
        [normalizedEmail, hash]
      );

      const user = result.rows[0];
      let wallet;
      try {
        wallet = await ensureUserWallet(user.id, user.email, "ethereum");
      } catch (err) {
        console.error("DB signup wallet error", err?.message || err);
        wallet = { status: "disconnected", error: err?.message || "Wallet create failed" };
      }

      const token = generateToken(user);
      return res.json({ ok: true, user, wallet, token });
    } catch (err) {
      console.error("DB signup error", err);
      dbError = err;
      useDB = false; // Fall back to in-memory
    }
  }

  // In-memory fallback
  console.log('using in-memory auth', dbError?.message || 'DB not configured');
  if (inMemoryUsers.has(normalizedEmail)) {
    return res
      .status(400)
      .json({ ok: false, error: "Email already exists" });
  }

  const hash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const user = {
    id,
    email: normalizedEmail,
    password_hash: hash,
    balance_usd: 100.00,
    is_verified: true,
  };
  inMemoryUsers.set(normalizedEmail, user);

  let wallet;
  try {
    wallet = await ensureUserWallet(id, normalizedEmail, "ethereum");
    console.log('wallet created', wallet);
  } catch (err) {
    console.error("inMemory signup wallet error", err?.message || err);
    wallet = { status: "disconnected", error: err?.message || "Wallet create failed" };
  }

  const token = generateToken(user);
  console.log('signup success', { id, email: normalizedEmail });
  return res.json({ ok: true, user: { id, email: normalizedEmail }, wallet, token });
};

export const signin = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ ok: false, error: "Email and password required" });
  }

  if (useInMemoryAuth) {
    const user = inMemoryUsers.get(normalizedEmail);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    // Ensure balance_usd and is_verified exist
    if (user.balance_usd === undefined) user.balance_usd = 100.00;
    if (user.is_verified === undefined) user.is_verified = true;

    let wallet;
    try {
      wallet = await ensureUserWallet(user.id, user.email, "ethereum");
    } catch (err) {
      console.error("inMemory signin wallet error", err?.message || err);
      wallet = { status: "disconnected", error: err?.message || "Wallet lookup failed" };
    }

    const token = generateToken(user);
    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        balance_usd: user.balance_usd,
        is_verified: user.is_verified,
      },
      wallet,
      token,
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash, balance_usd, is_verified FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    let wallet;
    try {
      wallet = await ensureUserWallet(user.id, user.email, "ethereum");
    } catch (err) {
      console.error("DB signin wallet error", err?.message || err);
      wallet = { status: "disconnected", error: err?.message || "Wallet lookup failed" };
    }

    const token = generateToken(user);
    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        balance_usd: user.balance_usd,
        is_verified: user.is_verified,
      },
      wallet,
      token,
    });
  } catch (err) {
    console.error("signin error", err);
    res.status(500).json({ ok: false, error: "Signin failed" });
  }
};

export const signout = async (req, res) => {
  // Token-based auth is stateless. Client simply discards the token.
  // For future token revocation, add a blacklist table and check against it in middleware.
  res.json({ ok: true, message: "Signed out successfully" });
};

export const topup = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  const { amount } = req.body;
  const topupAmount = parseFloat(amount);

  if (!topupAmount || topupAmount <= 0 || topupAmount > 1000) {
    return res.status(400).json({ ok: false, error: "Invalid amount (1-1000 USD)" });
  }

  try {
    if (useInMemoryAuth) {
      const fullUser = inMemoryUsers.get(normalizeEmail(user.email));
      if (!fullUser) {
        return res.status(401).json({ ok: false, error: "User not found" });
      }
      if (fullUser.balance_usd === undefined) fullUser.balance_usd = 100.00;
      fullUser.balance_usd += topupAmount;
      return res.json({
        ok: true,
        user: {
          id: fullUser.id,
          email: fullUser.email,
          balance_usd: fullUser.balance_usd,
          is_verified: fullUser.is_verified,
        },
        message: `Topped up $${topupAmount.toFixed(2)}`,
      });
    }

    // DB mode
    const result = await pool.query(
      `UPDATE users SET balance_usd = balance_usd + $1 WHERE id = $2
       RETURNING id, email, balance_usd, is_verified`,
      [topupAmount, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    const updatedUser = result.rows[0];
    res.json({
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        balance_usd: updatedUser.balance_usd,
        is_verified: updatedUser.is_verified,
      },
      message: `Topped up $${topupAmount.toFixed(2)}`,
    });
  } catch (err) {
    console.error("topup error", err);
    res.status(500).json({ ok: false, error: "Topup failed" });
  }
};

export const getMe = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  let fullUser;
  if (useInMemoryAuth) {
    fullUser = inMemoryUsers.get(normalizeEmail(user.email));
    if (!fullUser) {
      return res.status(401).json({ ok: false, error: "User not found" });
    }
    // Ensure fields exist
    if (fullUser.balance_usd === undefined) fullUser.balance_usd = 100.00;
    if (fullUser.is_verified === undefined) fullUser.is_verified = true;
  } else {
    const result = await pool.query(
      `SELECT id, email, balance_usd, is_verified FROM users WHERE id = $1`,
      [user.id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, error: "User not found" });
    }
    fullUser = result.rows[0];
  }

  let wallet;
  try {
    wallet = await ensureUserWallet(fullUser.id, fullUser.email, "ethereum");
  } catch (err) {
    console.error("getMe wallet error", err?.message || err);
    wallet = { status: "disconnected", error: err?.message || "Wallet lookup failed" };
  }

  res.json({
    ok: true,
    user: {
      id: fullUser.id,
      email: fullUser.email,
      balance_usd: fullUser.balance_usd,
      is_verified: fullUser.is_verified,
    },
    wallet,
  });
};
