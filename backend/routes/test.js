import express from "express";
import { authenticate } from "../middleware/auth.js";
import { depositTestFunds } from "../controllers/testController.js";

const router = express.Router();

router.post("/deposit", authenticate, depositTestFunds);

export default router;
