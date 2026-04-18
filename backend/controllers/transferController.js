import pool from "../db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
import { inMemoryUsers } from "./userController.js";
import sequelize from "../config/database.js";
import Balance from "../models/Balance.js";
import Transaction from "../models/Transaction.js";
dotenv.config();

const useInMemoryAuth = !process.env.DATABASE_URL;
const inMemoryTransfers = new Map();
const inMemoryPINs = new Map(); // Temporary PIN storage: key format = "senderID:transferID"

// Generate a 6-digit PIN
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Lookup user by email or UID (email in this case since we use emails as identifiers)
export const lookupRecipient = async (req, res) => {
  const { identifier } = req.body;

  if (!identifier) {
    return res.status(400).json({ ok: false, error: "Identifier (email or UID) required" });
  }

  try {
    let recipient;

    if (useInMemoryAuth) {
      // In-memory fallback - search for user in inMemoryUsers
      if (identifier.includes("@")) {
        // Search by email
        const normalizedIdentifier = identifier.toLowerCase();
        recipient = inMemoryUsers.get(normalizedIdentifier);
      } else {
        // Search by user ID
        for (const [, user] of inMemoryUsers) {
          if (user.id === identifier) {
            recipient = user;
            break;
          }
        }
      }

      if (!recipient) {
        return res.status(404).json({ ok: false, error: "Recipient not found" });
      }

      return res.json({
        ok: true,
        data: {
          id: recipient.id,
          email: recipient.email,
          is_verified: !!recipient.is_verified,
        },
      });
    }

    // Database mode
    let query;
    let params;

    if (identifier.includes("@")) {
      query = `SELECT id, email FROM users WHERE email = $1 LIMIT 1`;
      params = [identifier.toLowerCase()];
    } else {
      query = `SELECT id, email FROM users WHERE id = $1 LIMIT 1`;
      params = [identifier];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Recipient not found" });
    }

    recipient = result.rows[0];
    res.json({
      ok: true,
      data: {
        id: recipient.id,
        email: recipient.email,
        is_verified: !!recipient.is_verified,
      },
    });
  } catch (err) {
    console.error("lookupRecipient error", err);
    res.status(500).json({ ok: false, error: "Lookup failed" });
  }
};

// Initiate transfer - sender specifies recipient and amount
export const initiateTransfer = async (req, res) => {
  const senderId = req.user?.id;
  const senderEmail = req.user?.email;
  const { recipientId, amount, tokenSymbol, chain } = req.body;

  if (!senderId || !senderEmail) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  if (!recipientId || !amount || !tokenSymbol || !chain) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields: recipientId, amount, tokenSymbol, chain",
    });
  }

  if (senderId === recipientId) {
    return res.status(400).json({ ok: false, error: "Cannot send to yourself" });
  }

  if (amount <= 0) {
    return res.status(400).json({ ok: false, error: "Amount must be positive" });
  }

  try {
    if (useInMemoryAuth) {
      // In-memory mode
      const transferId = crypto.randomUUID();
      const pin = generatePIN();

      const transfer = {
        id: transferId,
        sender_id: senderId,
        sender_email: senderEmail,
        recipient_id: recipientId,
        amount: parseFloat(amount),
        token_symbol: tokenSymbol,
        chain,
        status: "pending_confirmation",
        created_at: new Date().toISOString(),
      };

      // Store transfer
      inMemoryTransfers.set(transferId, transfer);

      // Store PIN temporarily
      inMemoryPINs.set(`${senderId}:${transferId}`, pin);

      return res.json({
        ok: true,
        data: {
          transferId,
          status: "pending_confirmation",
          message: `Transfer initiated. PIN has been sent to your registered email/phone.`,
          pin, // In development, return PIN (remove in production)
        },
      });
    }

    // Database mode
    const insertResult = await pool.query(
      `INSERT INTO transfers (sender_id, recipient_id, amount, token_symbol, chain, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, sender_id, recipient_id, amount, token_symbol, chain, status, created_at`,
      [
        senderId,
        recipientId,
        amount,
        tokenSymbol,
        chain,
        "pending_confirmation",
        {
          sender_email: senderEmail,
          initiated_at: new Date().toISOString(),
        },
      ]
    );

    const transfer = insertResult.rows[0];
    const pin = generatePIN();

    // Store PIN temporarily (should use Redis in production)
    inMemoryPINs.set(`${senderId}:${transfer.id}`, pin);

    res.json({
      ok: true,
      data: {
        transferId: transfer.id,
        status: transfer.status,
        message: `Transfer initiated. PIN has been sent to ${senderEmail}.`,
        pin, // In development only
      },
    });
  } catch (err) {
    console.error("initiateTransfer error", err);
    res.status(500).json({ ok: false, error: "Transfer initiation failed" });
  }
};

// Confirm transfer with PIN and password
export const confirmTransfer = async (req, res) => {
  const senderId = req.user?.id;
  const { transferId, pin, password } = req.body;

  if (!senderId) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  if (!transferId || !pin || !password) {
    return res.status(400).json({
      ok: false,
      error: "Missing required fields: transferId, pin, password",
    });
  }

  try {
    if (useInMemoryAuth) {
      // In-memory mode
      const transfer = inMemoryTransfers.get(transferId);

      if (!transfer) {
        return res.status(404).json({ ok: false, error: "Transfer not found" });
      }

      if (transfer.sender_id !== senderId) {
        return res.status(403).json({ ok: false, error: "Unauthorized" });
      }

      if (transfer.status !== "pending_confirmation") {
        return res.status(400).json({ ok: false, error: "Transfer cannot be confirmed" });
      }

      // Verify PIN
      const storedPin = inMemoryPINs.get(`${senderId}:${transferId}`);
      if (storedPin !== pin) {
        return res.status(400).json({ ok: false, error: "Invalid PIN" });
      }

      // Ensure sender has enough testnet balance in USD
      const senderUser = Array.from(inMemoryUsers.values()).find((u) => u.id === senderId);
      const recipientUser = Array.from(inMemoryUsers.values()).find((u) => u.id === transfer.recipient_id);

      if (!senderUser || !recipientUser) {
        return res.status(404).json({ ok: false, error: "User not found" });
      }

      const transferAmount = Number(transfer.amount || 0);
      if (Number.isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({ ok: false, error: "Invalid transfer amount" });
      }

      if (senderUser.balance_usd < transferAmount) {
        return res.status(400).json({ ok: false, error: "Insufficient funds" });
      }

      senderUser.balance_usd -= transferAmount;
      recipientUser.balance_usd += transferAmount;

      // Mark transfer as completed
      transfer.status = "completed";
      transfer.completed_at = new Date().toISOString();
      inMemoryTransfers.set(transferId, transfer);

      // Clear PIN
      inMemoryPINs.delete(`${senderId}:${transferId}`);

      return res.json({
        ok: true,
        data: {
          transferId,
          status: "completed",
          message: "Transfer completed successfully",
          transfer,
        },
      });
    }

    // Database mode
    const transferResult = await pool.query(
      `SELECT id, sender_id, recipient_id, amount, token_symbol, status FROM transfers WHERE id = $1`,
      [transferId]
    );

    if (transferResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Transfer not found" });
    }

    const transfer = transferResult.rows[0];

    if (transfer.sender_id !== senderId) {
      return res.status(403).json({ ok: false, error: "Unauthorized" });
    }

    if (transfer.status !== "pending_confirmation") {
      return res.status(400).json({ ok: false, error: "Transfer cannot be confirmed" });
    }

    // Verify PIN
    const storedPin = inMemoryPINs.get(`${senderId}:${transferId}`);
    if (storedPin !== pin) {
      return res.status(400).json({ ok: false, error: "Invalid PIN" });
    }

    // Verify password
    const senderResult = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [senderId]
    );

    if (senderResult.rows.length === 0) {
      return res.status(401).json({ ok: false, error: "Sender not found" });
    }

    const sender = senderResult.rows[0];
    const validPassword = await bcrypt.compare(password, sender.password_hash);

    if (!validPassword) {
      return res.status(401).json({ ok: false, error: "Invalid password" });
    }

    // Transfer settlement: adjust balances and complete transfer atomically
    await pool.query("BEGIN");

    const senderBalanceResult = await pool.query(
      `SELECT balance_usd FROM users WHERE id = $1 FOR UPDATE`,
      [senderId]
    );

    if (senderBalanceResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Sender not found" });
    }

    const senderBalance = Number(senderBalanceResult.rows[0].balance_usd || 0);
    const transferAmount = Number(transfer.amount || 0);

    if (Number.isNaN(transferAmount) || transferAmount <= 0) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ ok: false, error: "Invalid transfer amount" });
    }

    if (senderBalance < transferAmount) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ ok: false, error: "Insufficient funds" });
    }

    const recipientBalanceResult = await pool.query(
      `SELECT balance_usd FROM users WHERE id = $1 FOR UPDATE`,
      [transfer.recipient_id]
    );

    if (recipientBalanceResult.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "Recipient not found" });
    }

    await pool.query(
      `UPDATE users SET balance_usd = balance_usd - $1 WHERE id = $2`,
      [transferAmount, senderId]
    );

    await pool.query(
      `UPDATE users SET balance_usd = balance_usd + $1 WHERE id = $2`,
      [transferAmount, transfer.recipient_id]
    );

    const updatedResult = await pool.query(
      `UPDATE transfers SET status = $1, completed_at = NOW() WHERE id = $2
       RETURNING id, sender_id, recipient_id, amount, token_symbol, chain, status, completed_at`,
      ["completed", transferId]
    );

    await pool.query("COMMIT");

    const completedTransfer = updatedResult.rows[0];

    // Clear PIN
    inMemoryPINs.delete(`${senderId}:${transferId}`);

    res.json({
      ok: true,
      data: {
        transferId: completedTransfer.id,
        status: completedTransfer.status,
        message: "Transfer completed successfully",
        transfer: completedTransfer,
      },
    });
  } catch (err) {
    console.error("confirmTransfer error", err);
    res.status(500).json({ ok: false, error: "Transfer confirmation failed" });
  }
};

// Get transfer history for a user
export const getTransferHistory = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  try {
    if (useInMemoryAuth) {
      // In-memory mode - filter transfers
      const transfers = Array.from(inMemoryTransfers.values()).filter(
        (t) => t.sender_id === userId || t.recipient_id === userId
      );

      return res.json({
        ok: true,
        data: {
          sent: transfers.filter((t) => t.sender_id === userId),
          received: transfers.filter((t) => t.recipient_id === userId),
        },
      });
    }

    // Database mode
    const result = await pool.query(
      `SELECT 
        t.id, 
        t.sender_id, 
        t.recipient_id, 
        t.amount, 
        t.token_symbol, 
        t.chain, 
        t.status, 
        t.created_at, 
        t.completed_at,
        s.email as sender_email,
        r.email as recipient_email
       FROM transfers t
       LEFT JOIN users s ON t.sender_id = s.id
       LEFT JOIN users r ON t.recipient_id = r.id
       WHERE t.sender_id = $1 OR t.recipient_id = $1
       ORDER BY t.created_at DESC
       LIMIT 100`,
      [userId]
    );

    const sent = result.rows.filter((t) => t.sender_id === userId);
    const received = result.rows.filter((t) => t.recipient_id === userId);

    res.json({
      ok: true,
      data: {
        sent,
        received,
        total: sent.length + received.length,
      },
    });
  } catch (err) {
    console.error("getTransferHistory error", err);
    res.status(500).json({ ok: false, error: "Failed to retrieve history" });
  }
};

export const transfer = async (req, res) => {
  const senderId = req.user?.id;
  const { recipientEmail, amount, requestReference, chain = "solana" } = req.body;

  if (!senderId) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  if (chain !== "solana") {
    return res.status(400).json({ ok: false, error: "Only Solana transfers are supported" });
  }

  const transferAmount = parseFloat(amount);
  if (!recipientEmail || Number.isNaN(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ ok: false, error: "Recipient email and positive amount are required" });
  }

  const normalizedRecipientEmail = recipientEmail.toLowerCase();

  if (useInMemoryAuth) {
    const sender = Array.from(inMemoryUsers.values()).find((u) => u.id === senderId);
    const recipient = Array.from(inMemoryUsers.values()).find((u) => u.email === normalizedRecipientEmail);

    if (!sender) {
      return res.status(404).json({ ok: false, error: "Sender not found" });
    }
    if (!recipient) {
      return res.status(404).json({ ok: false, error: "Recipient not found" });
    }
    if (sender.id === recipient.id) {
      return res.status(400).json({ ok: false, error: "Cannot transfer to yourself" });
    }
    if ((sender.available_balance || 0) < transferAmount) {
      return res.status(400).json({ ok: false, error: "Insufficient balance" });
    }

    sender.available_balance -= transferAmount;
    recipient.available_balance = (recipient.available_balance || 0) + transferAmount;

    const transaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      user_id: senderId,
      type: 'transfer',
      amount: transferAmount,
      status: 'completed',
      reference: requestReference || `transfer:${Date.now()}->${normalizedRecipientEmail}`,
      tx_hash: `solana-transfer-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    return res.json({
      ok: true,
      data: {
        transactionId: transaction.id,
        status: transaction.status,
        message: "Transfer completed successfully",
      },
    });
  }

  const recipientResult = await pool.query(`SELECT id, email FROM users WHERE email = $1`, [normalizedRecipientEmail]);
  if (recipientResult.rows.length === 0) {
    return res.status(404).json({ ok: false, error: "Recipient not found" });
  }

  const recipientId = recipientResult.rows[0].id;
  if (recipientId === senderId) {
    return res.status(400).json({ ok: false, error: "Cannot transfer to yourself" });
  }

  if (requestReference) {
    const existingTransaction = await Transaction.findOne({
      where: {
        user_id: senderId,
        type: 'transfer',
        reference: requestReference,
      },
    });

    if (existingTransaction) {
      return res.json({
        ok: true,
        data: {
          transactionId: existingTransaction.id,
          status: existingTransaction.status,
          message: "Duplicate request ignored. Existing transfer returned.",
        },
      });
    }
  }

  const t = await sequelize.transaction();

  try {
    const senderBalance = await Balance.findOne({ where: { user_id: senderId }, transaction: t, lock: true });
    if (!senderBalance || Number(senderBalance.available_balance) < transferAmount) {
      await t.rollback();
      return res.status(400).json({ ok: false, error: "Insufficient balance" });
    }

    await Balance.decrement('available_balance', { by: transferAmount, where: { user_id: senderId }, transaction: t });
    await Balance.increment('available_balance', { by: transferAmount, where: { user_id: recipientId }, transaction: t });

    const transaction = await Transaction.create({
      user_id: senderId,
      type: 'transfer',
      amount: transferAmount,
      status: 'completed',
      reference: requestReference || `transfer:${Date.now()}->${normalizedRecipientEmail}`,
      tx_hash: `solana-transfer-${Date.now()}`,
    }, { transaction: t });

    await t.commit();

    res.json({
      ok: true,
      data: {
        transactionId: transaction.id,
        status: transaction.status,
        message: "Transfer completed successfully",
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("transfer error", err);
    res.status(500).json({ ok: false, error: "Transfer failed" });
  }
};

function simulateSolanaWithdrawal(toAddress, amount) {
  const txHash = `solana-withdraw-${Date.now()}`;
  return Promise.resolve({ success: true, txHash });
}

export const withdraw = async (req, res) => {
  const userId = req.user?.id;
  const { amount, toAddress, chain = "solana" } = req.body;

  if (!userId) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  if (chain !== "solana") {
    return res.status(400).json({ ok: false, error: "Only Solana withdrawals are supported" });
  }

  const withdrawAmount = parseFloat(amount);
  if (!withdrawAmount || withdrawAmount <= 0 || !toAddress) {
    return res.status(400).json({ ok: false, error: "Valid amount and Solana address required" });
  }

  if (useInMemoryAuth) {
    const user = Array.from(inMemoryUsers.values()).find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }
    if ((user.available_balance || 0) < withdrawAmount) {
      return res.status(400).json({ ok: false, error: "Insufficient balance" });
    }

    user.available_balance -= withdrawAmount;
    const transaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      user_id: userId,
      type: 'withdrawal',
      amount: withdrawAmount,
      status: 'completed',
      reference: `withdrawal to ${toAddress}`,
      tx_hash: `solana-withdraw-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    return res.json({
      ok: true,
      data: {
        transactionId: transaction.id,
        status: transaction.status,
        message: "Withdrawal completed successfully",
      },
    });
  }

  const t = await sequelize.transaction();

  let transaction;
  try {
    const balance = await Balance.findOne({ where: { user_id: userId }, transaction: t, lock: true });
    if (!balance || Number(balance.available_balance) < withdrawAmount) {
      await t.rollback();
      return res.status(400).json({ ok: false, error: "Insufficient balance" });
    }

    transaction = await Transaction.create({
      user_id: userId,
      type: 'withdrawal',
      amount: withdrawAmount,
      status: 'pending',
      reference: `withdrawal to ${toAddress}`,
    }, { transaction: t });

    await Balance.decrement('available_balance', { by: withdrawAmount, where: { user_id: userId }, transaction: t });
    await t.commit();

    const result = await simulateSolanaWithdrawal(toAddress, withdrawAmount);

    if (!result.success) {
      const refundTransaction = await sequelize.transaction();
      await Balance.increment('available_balance', { by: withdrawAmount, where: { user_id: userId }, transaction: refundTransaction });
      await transaction.update({ status: 'failed', tx_hash: result.txHash || null }, { transaction: refundTransaction });
      await refundTransaction.commit();

      return res.status(500).json({ ok: false, error: "Withdrawal broadcast failed", details: result.message || "Transaction failed" });
    }

    await transaction.update({ status: 'completed', tx_hash: result.txHash }, { transaction: null });

    res.json({
      ok: true,
      data: {
        transactionId: transaction.id,
        status: 'completed',
        tx_hash: result.txHash,
        message: "Withdrawal completed successfully",
      },
    });
  } catch (err) {
    if (t.finished !== 'commit') {
      await t.rollback();
    }
    console.error("withdraw error", err);
    res.status(500).json({ ok: false, error: "Withdrawal failed" });
  }
};

// Get pending transfers for a recipient
export const getPendingTransfers = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  try {
    if (useInMemoryAuth) {
      // In-memory mode
      const transfers = Array.from(inMemoryTransfers.values()).filter(
        (t) => t.recipient_id === userId && t.status === "pending_confirmation"
      );

      return res.json({
        ok: true,
        data: transfers,
      });
    }

    // Database mode
    const result = await pool.query(
      `SELECT 
        t.id, 
        t.sender_id, 
        t.amount, 
        t.token_symbol, 
        t.chain, 
        t.status, 
        t.created_at,
        s.email as sender_email
       FROM transfers t
       LEFT JOIN users s ON t.sender_id = s.id
       WHERE t.recipient_id = $1 AND t.status != 'completed'
       ORDER BY t.created_at DESC`,
      [userId]
    );

    res.json({
      ok: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("getPendingTransfers error", err);
    res.status(500).json({ ok: false, error: "Failed to retrieve pending transfers" });
  }
};
