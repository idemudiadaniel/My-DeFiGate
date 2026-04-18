import crypto from "crypto";
import sequelize from "../config/database.js";
import Balance from "../models/Balance.js";
import Transaction from "../models/Transaction.js";
import { inMemoryUsers } from "./userController.js";

const useInMemoryAuth = !process.env.DATABASE_URL;

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

  if (useInMemoryAuth) {
    const user = Array.from(inMemoryUsers.values()).find((value) => value.id === userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    if (user.available_balance === undefined) {
      user.available_balance = 0;
    }

    user.available_balance += depositAmount;
    const transaction = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      user_id: userId,
      type: "deposit",
      amount: depositAmount,
      status: "completed",
      tx_hash: `solana-deposit-${Date.now()}`,
      reference: txReference,
      created_at: new Date().toISOString(),
    };

    return res.json({
      ok: true,
      data: {
        transaction,
        available_balance: user.available_balance,
      },
      message: "Test deposit applied",
    });
  }

  const t = await sequelize.transaction();
  try {
    const existing = await Transaction.findOne({
      where: { user_id: userId, type: "deposit", reference: txReference },
      transaction: t,
    });

    if (existing) {
      await t.rollback();
      return res.json({
        ok: true,
        data: {
          transaction: existing,
          message: "Existing deposit returned",
        },
      });
    }

    let balance = await Balance.findOne({ where: { user_id: userId }, transaction: t });
    if (!balance) {
      balance = await Balance.create({ user_id: userId, available_balance: 0 }, { transaction: t });
    }

    const transaction = await Transaction.create(
      {
        user_id: userId,
        type: "deposit",
        amount: depositAmount,
        status: "completed",
        tx_hash: `solana-deposit-${Date.now()}`,
        reference: txReference,
      },
      { transaction: t }
    );

    await Balance.increment("available_balance", {
      by: depositAmount,
      where: { user_id: userId },
      transaction: t,
    });

    await t.commit();

    return res.json({
      ok: true,
      data: {
        transaction,
        available_balance: Number(balance.available_balance) + depositAmount,
      },
      message: "Test deposit applied successfully",
    });
  } catch (err) {
    await t.rollback();
    console.error("depositTestFunds error", err);
    res.status(500).json({ ok: false, error: "Test deposit failed" });
  }
};
