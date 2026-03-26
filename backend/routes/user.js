import express from "express";
import { signup, signin, signout, getMe, topup } from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/signout", authenticate, signout);
router.get("/me", authenticate, getMe);
router.post("/topup", authenticate, topup);

router.get("/test", (req, res) => {
  res.json({ ok: true, message: "User routes working" });
});

export default router;
