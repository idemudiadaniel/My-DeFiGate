import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import pool from '../db.js';
import Balance from '../models/Balance.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

const processedSignatures = new Set(); // In production, use DB

export async function checkDeposits() {
  if (!process.env.DATABASE_URL) return; // Skip in in-memory mode

  try {
    // Get all wallets
    const wallets = await pool.query(`
      SELECT w.address, w.user_id, u.email
      FROM wallets w
      JOIN users u ON w.user_id = u.id
      WHERE w.chain = 'solana'
    `);

    for (const wallet of wallets.rows) {
      const publicKey = new PublicKey(wallet.address);

      // Get recent signatures (last 10)
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });

      for (const sig of signatures) {
        if (processedSignatures.has(sig.signature)) continue;

        // Get transaction
        const tx = await connection.getTransaction(sig.signature, { commitment: 'confirmed' });
        if (!tx) continue;

        // Check for USDC transfers
        const usdcTransfers = tx.transaction.message.instructions
          .map((ix, i) => {
            // Simplified: check if it's a token transfer to USDC
            // In reality, parse token program instructions
            // For MVP, assume direct transfers
            return null; // TODO: implement proper parsing
          })
          .filter(Boolean);

        if (usdcTransfers.length > 0) {
          // For each transfer, if to our address, credit
          for (const transfer of usdcTransfers) {
            if (transfer.to === wallet.address) {
              const amount = transfer.amount; // in smallest unit
              const amountInUSDC = amount / 1e6; // USDC has 6 decimals

              // Credit balance
              await Balance.increment('available_balance', { by: amountInUSDC, where: { user_id: wallet.user_id } });

              console.log(`Credited ${amountInUSDC} USDC to user ${wallet.email}`);
            }
          }
        }

        processedSignatures.add(sig.signature);
      }
    }
  } catch (error) {
    console.error('Deposit check error:', error);
  }
}

// Run every 15 seconds
setInterval(checkDeposits, 15000);

// Initial run
checkDeposits();