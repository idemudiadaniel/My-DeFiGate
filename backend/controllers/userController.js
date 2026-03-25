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

  if (useInMemoryAuth) {
    if (inMemoryUsers.has(normalizedEmail)) {
      return res
        .status(400)
        .json({ ok: false, error: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const user = { id, email: normalizedEmail, password_hash: hash };
    inMemoryUsers.set(normalizedEmail, user);

    let wallet;
    try {
      wallet = await ensureUserWallet(id, normalizedEmail, "ethereum");
    } catch (err) {
      console.error("inMemory signup wallet error", err?.message || err);
      wallet = { status: "disconnected", error: err?.message || "Wallet create failed" };
    }

    const token = generateToken(user);
    return res.json({ ok: true, user: { id, email: normalizedEmail }, wallet, token });
  }

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
    res.json({ ok: true, user, wallet, token });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ ok: false, error: "Email already exists" });
    }
    console.error("signup error", err);
    res.status(500).json({ ok: false, error: "Signup failed" });
  }
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

    let wallet;
    try {
      wallet = await ensureUserWallet(user.id, user.email, "ethereum");
    } catch (err) {
      console.error("inMemory signin wallet error", err?.message || err);
      wallet = { status: "disconnected", error: err?.message || "Wallet lookup failed" };
    }

    const token = generateToken(user);
    return res.json({ ok: true, user: { id: user.id, email: user.email }, wallet, token });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash FROM users WHERE email = $1`,
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
      user: { id: user.id, email: user.email },
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

export const getMe = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  let wallet;
  try {
    wallet = await ensureUserWallet(user.id, user.email, "ethereum");
  } catch (err) {
    console.error("getMe wallet error", err?.message || err);
    wallet = { status: "disconnected", error: err?.message || "Wallet lookup failed" };
  }

  res.json({
    ok: true,
    user: { id: user.id, email: user.email },
    wallet,
  });
};
