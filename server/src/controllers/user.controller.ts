import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { AppError } from "../utils/errors";

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    // req.user is attached by authenticate middleware
    res.status(200).json({
      status: "success",
      user: {
        user_id: req.user!.user_id,
        username: req.user!.username,
        email: req.user!.email,
        role: req.user!.role,
        status_text: req.user!.status_text,
        is_verified: req.user!.is_verified,
        spotify_token: req.user!.spotify_token,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function searchUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;
    const currentUserId = req.user!.user_id;

    if (!q || typeof q !== "string") {
      return res.status(200).json({
        status: "success",
        users: [],
      });
    }

    // Prefix search for verified active users excluding the current user
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: q,
          mode: "insensitive",
        },
        user_id: { not: currentUserId },
        is_verified: true,
        is_suspended: false,
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        role: true,
        status_text: true,
      },
      take: 15,
    });

    res.status(200).json({
      status: "success",
      users,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { user_id: id },
      select: {
        user_id: true,
        username: true,
        email: true,
        role: true,
        status_text: true,
        is_suspended: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User profile not found");
    }

    if (user.is_suspended) {
      throw new AppError(403, "This user account is suspended");
    }

    res.status(200).json({
      status: "success",
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { statusText } = req.body;
    const userId = req.user!.user_id;

    if (typeof statusText !== "string") {
      throw new AppError(400, "statusText parameter must be a string");
    }

    const truncatedStatus = statusText.trim().slice(0, 140);

    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: { status_text: truncatedStatus },
    });

    res.status(200).json({
      status: "success",
      message: "Status bubble updated successfully",
      status_text: updatedUser.status_text,
    });
  } catch (error) {
    next(error);
  }
}

export async function unlinkSpotify(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.user_id;

    await prisma.user.update({
      where: { user_id: userId },
      data: { spotify_token: null },
    });

    res.status(200).json({
      status: "success",
      message: "Spotify account unlinked successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUsername(req: Request, res: Response, next: NextFunction) {
  try {
    const { username } = req.body;
    const userId = req.user!.user_id;

    if (!username) {
      throw new AppError(400, "Username is required");
    }

    const trimmedUsername = username.trim();

    if (!/^[a-zA-Z0-9_]{3,32}$/.test(trimmedUsername)) {
      throw new AppError(400, "Username must be 3-32 characters long and contain only letters, numbers, and underscores");
    }

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (existingUser && existingUser.user_id !== userId) {
      throw new AppError(409, "Username is already taken");
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: { username: trimmedUsername },
    });

    res.status(200).json({
      status: "success",
      message: "Username updated successfully",
      user: {
        user_id: updatedUser.user_id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        status_text: updatedUser.status_text,
        is_verified: updatedUser.is_verified,
        spotify_token: updatedUser.spotify_token,
      },
    });
  } catch (error) {
    next(error);
  }
}
