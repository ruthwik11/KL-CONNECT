import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "../config/db";
import { AppError } from "../utils/errors";
import { sendOTP } from "../services/email.service";
import {
  signAccessToken,
  createRefreshToken,
  getUserIdFromRefreshToken,
  revokeRefreshToken,
} from "../utils/token.utils";

const KLU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@kluniversity\.in$/i;
const SALT_ROUNDS = 12;

const ALLOWED_ADMIN_EMAILS = [
  "joegoldberg@gmail.com",
  "jonathanmoore@gmail.com",
  "willbettelheim@gmail.com"
];

// Hash OTP helper (SHA-256)
function hashOTP(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      throw new AppError(400, "Username, email, and password are required");
    }

    // 1. Email format check: @kluniversity.in
    if (!KLU_EMAIL_REGEX.test(email) && !ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase())) {
      throw new AppError(400, "Registration restricted to verified @kluniversity.in academic emails only");
    }

    // Username format check
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      throw new AppError(400, "Username must be 3-32 characters long and contain only letters, numbers, and underscores");
    }

    if (password.length < 8) {
      throw new AppError(400, "Password must be at least 8 characters long");
    }

    // Check if email or username is already registered
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError(409, "Email is already registered");
      }
      throw new AppError(409, "Username is already taken");
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Save unverified user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password_hash,
        is_verified: false,
        role: "USER",
      },
    });

    res.status(201).json({
      status: "success",
      user_id: newUser.user_id,
      message: "Registration successful. OTP verification required.",
    });
  } catch (error) {
    next(error);
  }
}

export async function sendVerificationOTP(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError(400, "Email is required");
    }

    // Validate email format
    if (!KLU_EMAIL_REGEX.test(email) && !ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase())) {
      throw new AppError(400, "Invalid academic email domain");
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(404, "No account associated with this email address");
    }

    // Invalidate existing unused OTPs
    await prisma.oTP.updateMany({
      where: { email, consumed: false },
      data: { consumed: true },
    });

    // Generate random 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save hashed OTP to database
    await prisma.oTP.create({
      data: {
        email,
        code: hashOTP(otpCode),
        expires_at: expiresAt,
        user_id: user.user_id,
        consumed: false,
      },
    });

    // Send email (falls back to terminal log in dev)
    await sendOTP(email, otpCode);

    res.status(200).json({
      status: "success",
      message: "Verification code sent to your academic email",
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyVerificationOTP(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      throw new AppError(400, "Email and verification code are required");
    }

    const hashed = hashOTP(code);

    // Look up valid unused OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        code: hashed,
        consumed: false,
        expires_at: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      throw new AppError(400, "Verification code is invalid or has expired");
    }

    // Consume OTP
    await prisma.oTP.update({
      where: { otp_id: otpRecord.otp_id },
      data: { consumed: true },
    });

    // Verify User
    const user = await prisma.user.update({
      where: { email },
      data: { is_verified: true },
    });

    if (user.is_suspended) {
      throw new AppError(403, "Your account has been suspended. Please contact administration.");
    }

    // Generate session tokens
    const accessToken = signAccessToken({
      sub: user.user_id,
      username: user.username,
      role: user.role,
    });
    
    const refreshToken = await createRefreshToken(user.user_id);

    res.status(200).json({
      status: "success",
      message: "Email verified successfully",
      accessToken,
      refreshToken,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, "Email and password are required");
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password");
    }

    // Ensure email verification
    if (!user.is_verified) {
      throw new AppError(403, "Email address not verified. Please verify your OTP.");
    }

    // Ensure account is active
    if (user.is_suspended) {
      throw new AppError(403, "Your account has been suspended. Please contact administration.");
    }

    // Generate tokens
    const accessToken = signAccessToken({
      sub: user.user_id,
      username: user.username,
      role: user.role,
    });
    
    const refreshToken = await createRefreshToken(user.user_id);

    res.status(200).json({
      status: "success",
      accessToken,
      refreshToken,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, "Refresh token is required");
    }

    // Fetch user id from redis
    const userId = await getUserIdFromRefreshToken(refreshToken);
    if (!userId) {
      throw new AppError(401, "Invalid or expired refresh token");
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new AppError(401, "User session not found");
    }

    if (user.is_suspended) {
      throw new AppError(403, "Your account has been suspended");
    }

    // Token rotation: Revoke current token and generate new ones
    await revokeRefreshToken(refreshToken);

    const newAccessToken = signAccessToken({
      sub: user.user_id,
      username: user.username,
      role: user.role,
    });

    const newRefreshToken = await createRefreshToken(user.user_id);

    res.status(200).json({
      status: "success",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function provisionUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      throw new AppError(400, "Username, email, password, and role are required");
    }

    if (!["USER", "ADMIN"].includes(role)) {
      throw new AppError(400, "Invalid clearance role specified");
    }

    // Email domain validation
    if (!KLU_EMAIL_REGEX.test(email) && !ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase())) {
      throw new AppError(400, "Provisioned email must be under the @kluniversity.in domain");
    }

    // Check availability
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      throw new AppError(409, "Username or email is already registered");
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create verified user directly
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password_hash,
        role,
        is_verified: true,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Account provisioned successfully bypass OTP validation",
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}
