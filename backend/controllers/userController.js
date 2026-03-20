import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../db.js";
import { generateToken } from "../middleware/auth.js";

const useInMemoryAuth = !process.env.DATABASE_URL;
const inMemoryUsers = new Map();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
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
    
    const token = generateToken(user);
    return res.json({ ok: true, user: { id, email: normalizedEmail }, token });
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
    const token = generateToken(user);
    res.json({ ok: true, user, token });
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

    const token = generateToken(user);
    return res.json({ ok: true, user: { id: user.id, email: user.email }, token });
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

    const token = generateToken(user);
    res.json({
      ok: true,
      user: { id: user.id, email: user.email },
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
