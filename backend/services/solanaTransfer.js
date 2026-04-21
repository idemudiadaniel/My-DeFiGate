// services/solanaTransfer.js

import {
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey
} from "@solana/web3.js";
import { connection, senderKeypair } from "./solana.js";

export const sendSol = async (toAddress, amountSol) => {
  const lamports = amountSol * 1e9;

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderKeypair.publicKey,
      toPubkey: new PublicKey(toAddress),
      lamports,
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [senderKeypair]
  );

  return signature;
};