import crypto from "crypto";
import pool from "../db.js";
import Balance from "../models/Balance.js";
import Transaction from "../models/Transaction.js";

export const depositTestFunds = async (req, res) => {
  const userId = req.user?.id;
  const { amount, reference } = req.body;

  if (!userId) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  const depositAmount = parseFloat(amount);
  if (!depositAmount || depositAmount <= 0) {
    return res.status(400).json({ ok: false, error: "Valid deposit amount is required" });
  }

  const txReference = reference?.trim() || `test-deposit-${Date.now()}`;

  try {
    const existing = await pool.query(
      `SELECT id, amount, status FROM transactions WHERE user_id = $1 AND type = $2 AND reference = $3`,
      [userId, 'deposit', txReference]
    );

    if (existing.rows.length > 0) {
      const existingTx = existing.rows[0];
      const balanceResult = await pool.query(
        `SELECT balance FROM balances WHERE user_id = $1`,
        [userId]
      );

      return res.json({
        ok: true,
        data: {
          transaction: existingTx,
          available_balance: Number(balanceResult.rows[0]?.balance || 0),
          message: "Existing deposit returned",
        },
      });
    }

    await pool.query('BEGIN');

    let balanceResult = await pool.query(
      `SELECT balance FROM balances WHERE user_id = $1`,
      [userId]
    );

    if (balanceResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO balances (user_id, balance) VALUES ($1, $2)`,
        [userId, 0]
      );
    }

    const currentBalance = Number(balanceResult.rows[0]?.balance || 0);
    const newBalance = currentBalance + depositAmount;

    const transactionResult = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, balance_after, description, reference, tx_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, amount, status`,
      [
        userId,
        'deposit',
        depositAmount,
        newBalance,
        `Test deposit of $${depositAmount}`,
        txReference,
        `solana-deposit-${Date.now()}`,
        'completed'
      ]
    );

    await pool.query(
      `UPDATE balances SET balance = balance + $1 WHERE user_id = $2`,
      [depositAmount, userId]
    );

    await pool.query('COMMIT');

    const newBalanceResult = await pool.query(
      `SELECT balance FROM balances WHERE user_id = $1`,
      [userId]
    );

    return res.json({
      ok: true,
      data: {
        transaction: transactionResult.rows[0],
        available_balance: Number(newBalanceResult.rows[0]?.balance || 0),
      },
      message: "Test deposit applied",
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("depositTestFunds error", err);
    res.status(500).json({ ok: false, error: "Test deposit failed" });
  }
};
