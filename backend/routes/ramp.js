import express from "express";
import { authenticate } from "../middleware/auth.js";
import * as kotani from "../controllers/kotaniController.js";

const router = express.Router();

router.post("/onramp", authenticate, kotani.createOnramp);
router.post("/offramp", authenticate, kotani.createOfframp);
router.get("/rates", kotani.getRates);
router.get("/status/:txId", kotani.getTransactionStatus);
router.post("/webhook", kotani.webhookHandler);

// Keep legacy route for backward compatibility
router.post("/create-ramp", authenticate, kotani.createOnramp);

export default router;
