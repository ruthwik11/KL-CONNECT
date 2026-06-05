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
import { authLimiter, otpLimiter } from "../middleware/rateLimiter";
import { validate, registerSchema, loginSchema, sendOTPSchema, verifyOTPSchema, provisionUserSchema } from "../middleware/validation";

const router = Router();

// Public auth endpoints
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/otp/send", otpLimiter, validate(sendOTPSchema), sendVerificationOTP);
router.post("/otp/verify", otpLimiter, validate(verifyOTPSchema), verifyVerificationOTP);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Protected admin endpoints
router.post(
  "/admin/provision",
  authenticate,
  requireRole("ADMIN"),
  validate(provisionUserSchema),
  provisionUser
);

export default router;
