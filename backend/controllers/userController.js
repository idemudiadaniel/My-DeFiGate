import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../db.js";
import { generateToken } from "../middleware/auth.js";
import { ensureUserWallet } from "./walletController.js";
import { sendVerificationEmail } from "../services/emailService.js";
import { respondError, respondSuccess } from "../utils/response.js";
import Balance from "../models/Balance.js";
import Transaction from "../models/Transaction.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function generateVerificationToken() {
  return crypto.randomBytes(24).toString("hex");
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
  const preferredChain = "solana";

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

    // Create balance record with test net balance
    try {
      await Balance.create({
        user_id: user.id,
        available_balance: 100.0, // Test net balance for transaction testing
      });
    } catch (err) {
      console.error("Balance creation error", err);
      // Continue, but log
    }

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
        available_balance: 100.0,
        wallet,
      },
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

  try {
    const result = await pool.query(
      `SELECT id, email, name, wallet_address, phone, company, password_hash, is_verified, kyc_status, preferred_chain
       FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return respondError(res, 404, "Account not found. Please sign up first.", false);
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return respondError(res, 401, "Invalid credentials", false);
    }

    // Get balance
    const balanceResult = await pool.query(`SELECT available_balance FROM balances WHERE user_id = $1`, [user.id]);
    const available_balance = balanceResult.rows[0]?.available_balance || 0;

    let wallet;
    try {
      wallet = await ensureUserWallet(user.id, user.email, user.preferred_chain || "solana");
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
        available_balance: available_balance,
        is_verified: user.is_verified,
        kyc_status: user.kyc_status,
        wallet,
      },
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
  const { amount } = req.body;
  const userId = req.user.id;

  if (!amount || amount <= 0) {
    return respondError(res, 400, "Valid amount is required", false);
  }

  try {
    await pool.query('BEGIN');
    const balanceResult = await pool.query(
      `SELECT balance FROM balances WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    if (balanceResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return respondError(res, 404, "Balance not found", false);
    }
    const currentBalance = parseFloat(balanceResult.rows[0].balance);
    const newBalance = currentBalance + parseFloat(amount);
    await pool.query(
      `UPDATE balances SET balance = $1 WHERE user_id = $2`,
      [newBalance, userId]
    );
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, balance_after, description) VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'topup', amount, newBalance, 'Test topup']
    );
    await pool.query('COMMIT');
    return respondSuccess(res, { balance: newBalance }, "Topup successful");
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("topup error", err);
    return respondError(res, 500, "Unable to process topup", true, err.message);
  }
};

export const updateProfile = async (req, res) => {
  const user = req.user;
  const { name, phone, company } = req.body;

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

export const getTransactions = async (req, res) => {
  const user = req.user;

  try {
    const transactions = await Transaction.findAll({
      where: { user_id: user.id },
      order: [['created_at', 'DESC']],
    });

    return respondSuccess(res, { transactions }, "Transactions retrieved");
  } catch (err) {
    console.error("getTransactions error", err);
    return respondError(res, 500, "Failed to retrieve transactions", true, err.message);
  }
};

export const getMe = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.balance_usd, u.is_verified, b.available_balance
       FROM users u
       LEFT JOIN balances b ON u.id = b.user_id
       WHERE u.id = $1`,
      [user.id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, error: "User not found" });
    }
    const fullUser = result.rows[0];

    let wallet;
    try {
      wallet = await ensureUserWallet(fullUser.id, fullUser.email, "solana");
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
          available_balance: Number(fullUser.available_balance || 0),
          is_verified: fullUser.is_verified,
          wallet,
        },
      },
    });
  } catch (err) {
    console.error("getMe error", err);
    return respondError(res, 500, "Failed to get user data", true, err.message);
  }
};
