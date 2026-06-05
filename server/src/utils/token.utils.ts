import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getJWTKeys } from "../config/keys";
import redisClient from "../config/redis";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "15m";
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7 days in seconds

export interface JWTPayload {
  sub: string;
  username: string;
  role: string;
}

// Access Token: Signed using Asymmetric RS256 Private Key
export function signAccessToken(payload: JWTPayload): string {
  const { privateKey } = getJWTKeys();
  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: ACCESS_TTL as any,
  });
}

// Access Token: Verified using Asymmetric RS256 Public Key
export function verifyAccessToken(token: string): JWTPayload {
  const { publicKey } = getJWTKeys();
  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
  }) as JWTPayload;
}

// In-memory fallback store for refresh tokens
const inMemoryRefreshTokenStore = new Map<string, { userId: string; expiresAt: number }>();

// Clean up expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of inMemoryRefreshTokenStore.entries()) {
    if (data.expiresAt < now) {
      inMemoryRefreshTokenStore.delete(token);
    }
  }
}, 60 * 1000).unref();

// Refresh Token: Opaque 256-bit hexadecimal token stored in Redis
export async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + REFRESH_TTL_SEC * 1000;
  
  if (redisClient.isOpen && redisClient.isReady) {
    try {
      const redisKey = `rt:${token}`;
      await redisClient.set(redisKey, userId, {
        EX: REFRESH_TTL_SEC,
      });
      return token;
    } catch (err) {
      console.warn("⚠️ Failed to store refresh token in Redis, falling back to memory:", err);
    }
  }

  // Fallback to in-memory store
  inMemoryRefreshTokenStore.set(token, { userId, expiresAt });
  return token;
}

// Get the user ID associated with a refresh token, or null if invalid/expired
export async function getUserIdFromRefreshToken(token: string): Promise<string | null> {
  if (redisClient.isOpen && redisClient.isReady) {
    try {
      const redisKey = `rt:${token}`;
      return await redisClient.get(redisKey);
    } catch (err) {
      console.warn("⚠️ Failed to fetch refresh token from Redis, falling back to memory:", err);
    }
  }

  const record = inMemoryRefreshTokenStore.get(token);
  if (record) {
    if (record.expiresAt > Date.now()) {
      return record.userId;
    }
    inMemoryRefreshTokenStore.delete(token);
  }
  return null;
}

// Revoke/Delete a refresh token from Redis
export async function revokeRefreshToken(token: string): Promise<void> {
  if (redisClient.isOpen && redisClient.isReady) {
    try {
      const redisKey = `rt:${token}`;
      await redisClient.del(redisKey);
      return;
    } catch (err) {
      console.warn("⚠️ Failed to delete refresh token from Redis, falling back to memory:", err);
    }
  }
  inMemoryRefreshTokenStore.delete(token);
}

// ── httpOnly Cookie Helpers ──────────────────────────────────────────

import { Response } from "express";

export function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie("klc_rt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie("klc_rt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth",
  });
}
