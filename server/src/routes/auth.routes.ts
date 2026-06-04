import { Router } from "express";
import {
  register,
  sendVerificationOTP,
  verifyVerificationOTP,
  login,
  refresh,
  logout,
  provisionUser,
} from "../controllers/auth.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Public auth endpoints
router.post("/register", register);
router.post("/otp/send", sendVerificationOTP);
router.post("/otp/verify", verifyVerificationOTP);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Protected admin endpoints
router.post(
  "/admin/provision",
  authenticate,
  requireRole("ADMIN"),
  provisionUser
);

export default router;
