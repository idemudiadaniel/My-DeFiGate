import axios from "axios";
import dotenv from "dotenv";
import pool from "../db.js";
dotenv.config();

const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const PRIVY_BASE = "https://api.privy.io";

const inMemoryWallets = new Map();

const isPrivyEnabled = Boolean(PRIVY_APP_ID && PRIVY_APP_SECRET);

// Privy uses Basic Auth: base64(appId:appSecret)
function privyHeaders() {
  const encoded = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString(
    "base64"
  );
  return {
    Authorization: `Basic ${encoded}`,
    "privy-app-id": PRIVY_APP_ID,
    "Content-Type": "application/json",
  };
}

async function createPrivyWallet(chainType = "solana") {
  if (!isPrivyEnabled) {
    throw new Error("Privy credentials not configured");
  }

  if (chainType !== "solana") {
    throw new Error("Only Solana wallets are supported");
  }

  const body = { chain_type: chainType };
  const r = await axios.post(`${PRIVY_BASE}/v1/wallets`, body, {
    headers: privyHeaders(),
  });
  return r.data;
}

async function getWalletByUserIdAndChain(userId, chainType) {
  const result = await pool.query(
    `SELECT id, user_id, provider, provider_wallet_id, address, chain, created_at
     FROM wallets WHERE user_id = $1 AND chain = $2 LIMIT 1`,
    [userId, chainType]
  );
  return result.rows[0] || null;
}

async function saveWallet(userId, privyWallet, chainType = "solana") {
  const providerWalletId = privyWallet.id || null;
  const address =
    (privyWallet.accounts && privyWallet.accounts[0]?.address) ||
    privyWallet.address ||
    null;

  const insert = await pool.query(
    `INSERT INTO wallets (user_id, provider, provider_wallet_id, address, chain)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, provider, provider_wallet_id, address, chain, created_at`,
    [userId, "privy", providerWalletId, address, chainType]
  );

  // update user record for easier query
  await pool.query(
    `UPDATE users SET privy_wallet_id = $1, updated_at = NOW() WHERE id = $2`,
    [providerWalletId, userId]
  );

  return insert.rows[0];
}

export async function ensureUserWallet(userId, email, chainType = "solana") {
  if (!userId || !email) {
    throw new Error("Missing user ID or email for wallet creation");
  }

  if (chainType !== "solana") {
    throw new Error("Only Solana wallets are supported");
  }

  const key = `${userId}:${chainType}`;

  // Try DB first if configured
  if (process.env.DATABASE_URL) {
    try {
      const existing = await getWalletByUserIdAndChain(userId, chainType);
      if (existing) {
        return { ...existing, status: "connected" };
      }

      if (!isPrivyEnabled) {
        const wallet = {
          id: key,
          user_id: userId,
          provider: "local",
          provider_wallet_id: null,
          address: null,
          chain: chainType,
          status: "disconnected",
          created_at: new Date().toISOString(),
        };
        return wallet;
      }

      const privyWallet = await createPrivyWallet(chainType);
      const wallet = await saveWallet(userId, privyWallet, chainType);
      return { ...wallet, status: "connected", metadata: privyWallet };
    } catch (err) {
      console.error("DB wallet error, falling back to in-memory", err?.message || err);
    }
  }

  // In-memory fallback
  if (inMemoryWallets.has(key)) {
    return inMemoryWallets.get(key);
  }

  if (!isPrivyEnabled) {
    const wallet = {
      id: key,
      address: `sol_${userId.substring(0, 8).toUpperCase()}`,
      provider: "local",
      provider_wallet_id: null,
      chain: chainType,
      status: "disconnected",
      created_at: new Date().toISOString(),
    };
    inMemoryWallets.set(key, wallet);
    return wallet;
  }

  // For Privy with different chains, we create a new Privy wallet
  try {
    const privyWallet = await createPrivyWallet(chainType);
    const wallet = {
      id: `${privyWallet.id}_${chainType}`,
      provider: "privy",
      provider_wallet_id: privyWallet.id,
      address: privyWallet.accounts?.[0]?.address || privyWallet.address || null,
      chain: chainType,
      status: "connected",
      created_at: new Date().toISOString(),
      metadata: privyWallet,
    };
    inMemoryWallets.set(key, wallet);
    return wallet;
  } catch (err) {
    console.error("ensureUserWallet privy error", err?.response?.data || err?.message || err);
    const wallet = {
      id: key,
      address: `sol_${userId.substring(0, 8).toUpperCase()}`,
      provider: "local",
      provider_wallet_id: null,
      chain: chainType,
      status: "disconnected",
      created_at: new Date().toISOString(),
      error: err?.response?.data || err?.message,
    };
    inMemoryWallets.set(key, wallet);
    return wallet;
  }
}

// POST /wallet/create — create a server-side wallet via Privy
export const createEmbeddedWallet = async (req, res) => {
  const userId = req.user?.id || req.body.userId;
  const email = req.user?.email || req.body.email;
  const chainType = req.body.chainType || "solana";
  if (!userId || !email) {
    return res.status(400).json({ ok: false, error: "Missing userId or email" });
  }

  if (chainType !== "solana") {
    return res.status(400).json({ ok: false, error: "Only Solana wallets are supported" });
  }

  try {
    const wallet = await ensureUserWallet(userId, email, chainType);
    return res.json({ ok: true, data: wallet });
  } catch (err) {
    console.error("wallet creation error", err?.message || err);
    return res
      .status(err?.response?.status || 500)
      .json({ ok: false, error: err?.response?.data || err?.message });
  }
};

// POST /wallet/send — sign and broadcast a transaction via Privy
export const sendTxToAddress = async (req, res) => {
  const { walletId, toAddress, tokenAddress, amount, chain } = req.body;

  if (!walletId || !toAddress || !amount) {
    return res
      .status(400)
      .json({ ok: false, error: "walletId, toAddress, and amount are required" });
  }

  if (chain !== "solana") {
    return res
      .status(400)
      .json({ ok: false, error: "Only Solana transactions are supported" });
  }

  try {
    // Build a Solana transaction request for Privy
    const caip2 = chainToCaip2(chain);
    const txBody = {
      chain_type: "solana",
      method: "solana_signAndSendTransaction",
      caip2,
      params: {
        transaction: {
          to: toAddress,
          value: Math.floor(amount * 1e9),
        },
      },
    };

    // If a token address is provided, build an ERC-20 transfer instead
    if (tokenAddress) {
      const transferData = encodeErc20Transfer(toAddress, amount);
      txBody.params.transaction = {
        to: tokenAddress,
        data: transferData,
        value: 0,
      };
    }

    const r = await axios.post(
      `${PRIVY_BASE}/v1/wallets/${walletId}/rpc`,
      txBody,
      { headers: privyHeaders() }
    );

    return res.json({ ok: true, tx: r.data });
  } catch (err) {
    console.error("privy send tx error", err?.response?.data || err.message);
    return res
      .status(err?.response?.status || 500)
      .json({ ok: false, error: err?.response?.data || err.message });
  }
};

// GET /wallet/:walletId — get wallet details
export const getWallet = async (req, res) => {
  const { walletId } = req.params;
  try {
    const r = await axios.get(`${PRIVY_BASE}/v1/wallets/${walletId}`, {
      headers: privyHeaders(),
    });
    return res.json({ ok: true, data: r.data });
  } catch (err) {
    console.error("privy get wallet error", err?.response?.data || err.message);
    return res
      .status(err?.response?.status || 500)
      .json({ ok: false, error: err?.response?.data || err.message });
  }
};

// Map chain name to CAIP-2 identifier
function chainToCaip2(chain) {
  const map = {
    ethereum: "eip155:1",
    celo: "eip155:42220",
    base: "eip155:8453",
    polygon: "eip155:137",
    arbitrum: "eip155:42161",
    optimism: "eip155:10",
    solana: "solana:mainnet",
  };
  return map[chain] || "solana:mainnet";
}

// Minimal ABI encoding for ERC-20 transfer(address,uint256)
function encodeErc20Transfer(to, amount) {
  const selector = "0xa9059cbb";
  const addr = to.toLowerCase().replace("0x", "").padStart(64, "0");
  const val = BigInt(Math.floor(amount * 1e18))
    .toString(16)
    .padStart(64, "0");
  return selector + addr + val;
}
