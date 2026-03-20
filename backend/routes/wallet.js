import express from "express";
import { authenticate } from "../middleware/auth.js";
import * as wallet from "../controllers/walletController.js";

const router = express.Router();

router.post("/create", authenticate, wallet.createEmbeddedWallet);
router.post("/send", authenticate, wallet.sendTxToAddress);
router.get("/:walletId", authenticate, wallet.getWallet);

export default router;
