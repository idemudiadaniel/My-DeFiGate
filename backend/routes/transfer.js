import express from "express";
import { authenticate } from "../middleware/auth.js";
import * as transfer from "../controllers/transferController.js";

const router = express.Router();

router.post("/lookup", transfer.lookupRecipient);
router.post("/initiate", authenticate, transfer.initiateTransfer);
router.post("/confirm", authenticate, transfer.confirmTransfer);
router.get("/history", authenticate, transfer.getTransferHistory);
router.get("/pending", authenticate, transfer.getPendingTransfers);

export default router;
