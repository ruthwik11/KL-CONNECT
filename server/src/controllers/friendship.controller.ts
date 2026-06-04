import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { AppError } from "../utils/errors";

export async function sendFriendRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { targetId } = req.body;
    const userId = req.user!.user_id;

    if (!targetId) {
      throw new AppError(400, "Target player ID is required");
    }

    if (userId === targetId) {
      throw new AppError(400, "You cannot send a friend request to yourself");
    }

    // Check if target user exists and is not suspended
    const targetUser = await prisma.user.findUnique({
      where: { user_id: targetId },
    });

    if (!targetUser) {
      throw new AppError(404, "Target player account not found");
    }

    if (targetUser.is_suspended) {
      throw new AppError(400, "Cannot add a suspended player");
    }

    // Sort IDs to guarantee single record uniqueness
    const [user_a_id, user_b_id] = [userId, targetId].sort();

    const existing = await prisma.friendship.findUnique({
      where: {
        user_a_id_user_b_id: { user_a_id, user_b_id },
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        throw new AppError(409, "You are already friends with this player");
      }

      // If a request is already pending
      if (existing.status === "PENDING") {
        if (existing.request_sender_id === userId) {
          throw new AppError(409, "Friend request is already pending approval");
        } else {
          // Reciprocal request: Auto-accept the request!
          const updated = await prisma.friendship.update({
            where: { id: existing.id },
            data: { status: "ACCEPTED" },
          });

          return res.status(200).json({
            status: "success",
            message: "Mutual request matched. Friendship accepted!",
            friendship: updated,
          });
        }
      }
    }

    // Create new friend request
    const newRequest = await prisma.friendship.create({
      data: {
        user_a_id,
        user_b_id,
        request_sender_id: userId,
        status: "PENDING",
      },
    });

    res.status(201).json({
      status: "success",
      message: "Friend request sent successfully",
      friendship: newRequest,
    });
  } catch (error) {
    next(error);
  }
}

export async function acceptFriendRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.user_id;

    const friendship = await prisma.friendship.findUnique({
      where: { id },
    });

    if (!friendship) {
      throw new AppError(404, "Friend request record not found");
    }

    if (friendship.status !== "PENDING") {
      throw new AppError(400, "Friend request is already accepted or resolved");
    }

    // Enforce that user can only accept requests sent to them
    if (friendship.user_a_id !== userId && friendship.user_b_id !== userId) {
      throw new AppError(403, "You are not a participant in this friendship request");
    }

    if (friendship.request_sender_id === userId) {
      throw new AppError(400, "You cannot accept your own pending friend request");
    }

    const updated = await prisma.friendship.update({
      where: { id },
      data: { status: "ACCEPTED" },
    });

    res.status(200).json({
      status: "success",
      message: "Friend request accepted successfully",
      friendship: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectOrRemoveFriendship(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.user_id;

    const friendship = await prisma.friendship.findUnique({
      where: { id },
    });

    if (!friendship) {
      throw new AppError(404, "Friendship record not found");
    }

    if (friendship.user_a_id !== userId && friendship.user_b_id !== userId) {
      throw new AppError(403, "Access denied");
    }

    await prisma.friendship.delete({
      where: { id },
    });

    res.status(200).json({
      status: "success",
      message: friendship.status === "ACCEPTED" ? "Friend removed successfully" : "Friend request rejected successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function listFriends(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.user_id;

    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ user_a_id: userId }, { user_b_id: userId }],
      },
      include: {
        user_a: {
          select: {
            user_id: true,
            username: true,
            email: true,
            role: true,
            status_text: true,
            is_suspended: true,
            spotify_token: true,
          },
        },
        user_b: {
          select: {
            user_id: true,
            username: true,
            email: true,
            role: true,
            status_text: true,
            is_suspended: true,
            spotify_token: true,
          },
        },
      },
    });

    // Map rows to return the other user's details
    const friends = friendships.map((f) => {
      const otherUser = f.user_a_id === userId ? f.user_b : f.user_a;
      return {
        friendship_id: f.id,
        ...otherUser,
      };
    });

    res.status(200).json({
      status: "success",
      friends,
    });
  } catch (error) {
    next(error);
  }
}

export async function listPendingRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.user_id;

    const pending = await prisma.friendship.findMany({
      where: {
        status: "PENDING",
        OR: [{ user_a_id: userId }, { user_b_id: userId }],
        request_sender_id: { not: userId }, // Sent to current user, not initiated by them
      },
      include: {
        user_a: {
          select: {
            user_id: true,
            username: true,
            email: true,
            role: true,
            status_text: true,
          },
        },
        user_b: {
          select: {
            user_id: true,
            username: true,
            email: true,
            role: true,
            status_text: true,
          },
        },
      },
    });

    const requests = pending.map((f) => {
      const requester = f.user_a_id === f.request_sender_id ? f.user_a : f.user_b;
      return {
        friendship_id: f.id,
        requester: {
          user_id: requester.user_id,
          username: requester.username,
          email: requester.email,
          role: requester.role,
          status_text: requester.status_text,
        },
        sent_at: f.created_at,
      };
    });

    res.status(200).json({
      status: "success",
      requests,
    });
  } catch (error) {
    next(error);
  }
}
