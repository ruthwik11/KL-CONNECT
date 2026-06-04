import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { verifyAccessToken } from "../utils/token.utils";
import prisma from "../config/db";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Authorization token missing or malformed");
    }

    const token = authHeader.split(" ")[1];
    
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new AppError(401, "Access token has expired");
      }
      throw new AppError(401, "Invalid access token");
    }

    // Lookup user in database
    const user = await prisma.user.findUnique({
      where: { user_id: decoded.sub },
    });

    if (!user) {
      throw new AppError(401, "User session not found");
    }

    if (user.is_suspended) {
      throw new AppError(403, "Account is suspended. Access denied.");
    }

    // Attach user payload to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, "Authentication required");
      }

      if (!roles.includes(req.user.role)) {
        throw new AppError(403, "Forbidden: Insufficient clearances");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
