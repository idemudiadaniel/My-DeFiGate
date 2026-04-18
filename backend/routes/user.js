import express from "express";
import { signup, signin, signout, getMe, topup, verifyEmail, resendVerification, updateProfile, changePassword, enable2FA, getTransactions } from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/signout", authenticate, signout);
router.get("/me", authenticate, getMe);
router.post("/topup", authenticate, topup);
router.put("/profile", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);
router.get("/transactions", authenticate, getTransactions);

router.get("/test", (req, res) => {
  res.json({ ok: true, message: "User routes working" });
});

export default router;
