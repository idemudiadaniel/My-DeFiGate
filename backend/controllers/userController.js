import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../db.js";
import { generateToken } from "../middleware/auth.js";
import { ensureUserWallet } from "./walletController.js";
import { sendVerificationEmail } from "../services/emailService.js";
import { respondError, respondSuccess } from "../utils/response.js";

const useInMemoryAuth = !process.env.DATABASE_URL;
export const inMemoryUsers = new Map();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function generateVerificationToken() {
  return crypto.randomBytes(24).toString("hex");
}

async function findInMemoryUserByToken(token) {
  for (const user of inMemoryUsers.values()) {
    if (user.email_verification_token === token) {
      return user;
    }
  }
  return null;
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
  const { email, password, name, walletAddress, phone, company } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password || password.length < 6) {
    return respondError(res, 400, "Email and password (min 6 chars) are required", false);
  }

  const verificationToken = generateVerificationToken();
  const preferredChain = "celo";

  if (useInMemoryAuth) {
    if (inMemoryUsers.has(normalizedEmail)) {
      return respondError(res, 409, "User already exists with this email", false);
    }

    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const user = {
      id,
      email: normalizedEmail,
      name: name || null,
      walletAddress: walletAddress || null,
      phone: phone || null,
      company: company || null,
      password_hash: hash,
      balance_usd: 100.0,
      is_verified: true,
      kyc_status: "pending",
      email_verification_token: null,
      preferred_chain: preferredChain,
    };
    inMemoryUsers.set(normalizedEmail, user);

    let wallet;
    try {
      wallet = await ensureUserWallet(id, normalizedEmail, preferredChain);
    } catch (err) {
      console.error("inMemory signup wallet error", err?.message || err);
      wallet = { status: "disconnected", error: err?.message || "Wallet create failed" };
    }

    const token = generateToken(user);
    return respondSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        phone: user.phone,
        company: user.company,
        is_verified: user.is_verified,
        kyc_status: user.kyc_status,
      },
      wallet,
      token,
    }, "Account created and authenticated");
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, wallet_address, phone, company, is_verified, email_verification_token, kyc_status, preferred_chain)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7, 'pending', $8)
       RETURNING id, email, name, wallet_address, phone, company, is_verified, kyc_status, preferred_chain`,
      [normalizedEmail, hash, name || null, walletAddress || null, phone || null, company || null, verificationToken, preferredChain]
    );

    const user = result.rows[0];
    
    // Mark user as verified immediately (skip verification step for dev)
    await pool.query(
      `UPDATE users SET is_verified = true WHERE id = $1`,
      [user.id]
    );
    user.is_verified = true;

    let wallet;
    try {
      wallet = await ensureUserWallet(user.id, user.email, preferredChain);
    } catch (err) {
      console.error("DB signup wallet error", err?.message || err);
      wallet = { status: "disconnected", error: err?.message || "Wallet create failed" };
    }

    const token = generateToken(user);
    return respondSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.wallet_address,
        phone: user.phone,
        company: user.company,
        is_verified: user.is_verified,
        kyc_status: user.kyc_status,
      },
      wallet,
      token,
    }, "Account created and authenticated");
  } catch (err) {
    console.error("DB signup error", err);
    // Handle Sequelize unique constraint errors
    if (err.name === "SequelizeUniqueConstraintError") {
      const field = err.errors?.[0]?.path || "field";
      return respondError(res, 409, `User already exists with this ${field}`, false);
    }
    // Handle raw PostgreSQL unique constraint
    if (err.code === "23505") {
      return respondError(res, 409, "User already exists with this email or wallet", false);
    }
    return respondError(res, 500, "Account creation failed", true, err.message);
  }
};

export const signin = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return respondError(res, 400, "Email and password required", false);
  }

  if (useInMemoryAuth) {
    const user = inMemoryUsers.get(normalizedEmail);
    if (!user) {
      return respondError(res, 401, "Invalid credentials", false);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return respondError(res, 401, "Invalid credentials", false);
    }

    let wallet;
    try {
      wallet = await ensureUserWallet(user.id, user.email, user.preferred_chain || "celo");
    } catch (err) {
      console.error("inMemory signin wallet error", err?.message || err);
      wallet = { status: "disconnected", error: err?.message || "Wallet lookup failed" };
    }

    const token = generateToken(user);
    return respondSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        phone: user.phone,
        company: user.company,
        balance_usd: user.balance_usd,
        is_verified: user.is_verified,
        kyc_status: user.kyc_status,
      },
      wallet,
      token,
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, name, wallet_address, phone, company, password_hash, balance_usd, is_verified, kyc_status, preferred_chain
       FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return respondError(res, 401, "Invalid credentials", false);
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return respondError(res, 401, "Invalid credentials", false);
    }

    let wallet;
    try {
      wallet = await ensureUserWallet(user.id, user.email, user.preferred_chain || "celo");
    } catch (err) {
      console.error("DB signin wallet error", err?.message || err);
      wallet = { status: "disconnected", error: err?.message || "Wallet lookup failed" };
    }

    const token = generateToken(user);
    return respondSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.wallet_address,
        phone: user.phone,
        company: user.company,
        balance_usd: user.balance_usd,
        is_verified: user.is_verified,
        kyc_status: user.kyc_status,
      },
      wallet,
      token,
    });
  } catch (err) {
    console.error("DB signin error", err?.message || err);
    return respondError(res, 500, "Sign in failed", true, err.message);
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return respondError(res, 400, "Verification token is required", false);
  }

  if (useInMemoryAuth) {
    const user = await findInMemoryUserByToken(token);
    if (!user) {
      return respondError(res, 404, "Verification token invalid or expired", false);
    }
    user.is_verified = true;
    user.email_verification_token = null;
    user.email_verified_at = new Date().toISOString();
    return respondSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        is_verified: user.is_verified,
      },
    }, "Email verified successfully");
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET is_verified = true,
           email_verification_token = NULL,
           email_verified_at = NOW()
       WHERE email_verification_token = $1
       RETURNING id, email, is_verified`,
      [token]
    );

    if (result.rows.length === 0) {
      return respondError(res, 404, "Verification token invalid or expired", false);
    }

    return respondSuccess(res, {
      user: result.rows[0],
    }, "Email verified successfully");
  } catch (err) {
    console.error("verifyEmail error", err);
    return respondError(res, 500, "Verification failed", true, err.message);
  }
};

export const resendVerification = async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return respondError(res, 400, "Email is required", false);
  }

  if (useInMemoryAuth) {
    const user = inMemoryUsers.get(normalizedEmail);
    if (!user) {
      return respondError(res, 404, "User not found", false);
    }
    if (user.is_verified) {
      return respondError(res, 400, "Email is already verified", false);
    }
    const newToken = generateVerificationToken();
    user.email_verification_token = newToken;
    const emailResponse = await sendVerificationEmail(normalizedEmail, newToken);
    return respondSuccess(res, { verificationEmail: emailResponse.verificationUrl }, "Verification email resent.");
  }

  try {
    const userResult = await pool.query(
      `SELECT id, email, is_verified FROM users WHERE email = $1`,
      [normalizedEmail]
    );
    if (userResult.rows.length === 0) {
      return respondError(res, 404, "User not found", false);
    }
    const user = userResult.rows[0];
    if (user.is_verified) {
      return respondError(res, 400, "Email is already verified", false);
    }
    const newToken = generateVerificationToken();
    await pool.query(
      `UPDATE users SET email_verification_token = $1 WHERE email = $2`,
      [newToken, normalizedEmail]
    );
    const emailResponse = await sendVerificationEmail(normalizedEmail, newToken);
    return respondSuccess(res, { verificationEmail: emailResponse.verificationUrl }, "Verification email resent.");
  } catch (err) {
    console.error("resendVerification error", err);
    return respondError(res, 500, "Unable to resend verification email", true, err.message);
  }
};

export const signout = async (req, res) => {
  return respondSuccess(res, {}, "Signed out successfully");
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

export const updateProfile = async (req, res) => {
  const user = req.user;
  const { name, phone, company } = req.body;

  if (useInMemoryAuth) {
    const fullUser = inMemoryUsers.get(normalizeEmail(user.email));
    if (!fullUser) {
      return respondError(res, 401, "User not found", false);
    }
    if (name !== undefined) fullUser.name = name;
    if (phone !== undefined) fullUser.phone = phone;
    if (company !== undefined) fullUser.company = company;
    return respondSuccess(res, {
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        walletAddress: fullUser.walletAddress,
        phone: fullUser.phone,
        company: fullUser.company,
      },
    }, "Profile updated");
  }

  try {
    const result = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), company = COALESCE($3, company), updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, name, wallet_address, phone, company`,
      [name, phone, company, user.id]
    );

    if (result.rows.length === 0) {
      return respondError(res, 404, "User not found", false);
    }

    const updatedUser = result.rows[0];
    return respondSuccess(res, {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        walletAddress: updatedUser.wallet_address,
        phone: updatedUser.phone,
        company: updatedUser.company,
      },
    }, "Profile updated");
  } catch (err) {
    console.error("updateProfile error", err);
    return respondError(res, 500, "Profile update failed", true, err.message);
  }
};

export const changePassword = async (req, res) => {
  const user = req.user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return respondError(res, 400, "Current password and new password (min 6 chars) required", false);
  }

  if (useInMemoryAuth) {
    const fullUser = inMemoryUsers.get(normalizeEmail(user.email));
    if (!fullUser) {
      return respondError(res, 401, "User not found", false);
    }
    const valid = await bcrypt.compare(currentPassword, fullUser.password_hash);
    if (!valid) {
      return respondError(res, 401, "Current password incorrect", false);
    }
    fullUser.password_hash = await bcrypt.hash(newPassword, 10);
    return respondSuccess(res, {}, "Password changed");
  }

  try {
    const result = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return respondError(res, 404, "User not found", false);
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return respondError(res, 401, "Current password incorrect", false);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, user.id]
    );

    return respondSuccess(res, {}, "Password changed");
  } catch (err) {
    console.error("changePassword error", err);
    return respondError(res, 500, "Password change failed", true, err.message);
  }
};

export const enable2FA = async (req, res) => {
  const user = req.user;

  // For simplicity, just set a flag. In real app, integrate with 2FA library.
  if (useInMemoryAuth) {
    const fullUser = inMemoryUsers.get(normalizeEmail(user.email));
    if (!fullUser) {
      return respondError(res, 401, "User not found", false);
    }
    fullUser.two_fa_enabled = true;
    return respondSuccess(res, { two_fa_enabled: true }, "2FA enabled");
  }

  try {
    await pool.query(
      `UPDATE users SET two_fa_enabled = true, updated_at = NOW() WHERE id = $1`,
      [user.id]
    );
    return respondSuccess(res, { two_fa_enabled: true }, "2FA enabled");
  } catch (err) {
    console.error("enable2FA error", err);
    return respondError(res, 500, "2FA enable failed", true, err.message);
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
    data: {
      user: {
        id: fullUser.id,
        email: fullUser.email,
        balance_usd: fullUser.balance_usd,
        is_verified: fullUser.is_verified,
      },
      wallet,
    },
  });
};
