import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { AppError } from "../utils/errors";

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { targetId, targetType, content } = req.body;
    const senderId = req.user!.user_id;

    if (!targetId || !targetType || !content) {
      throw new AppError(400, "targetId, targetType (DM or GROUP), and content are required");
    }

    if (!["DM", "GROUP"].includes(targetType)) {
      throw new AppError(400, "Invalid targetType. Must be 'DM' or 'GROUP'");
    }

    if (targetType === "DM") {
      // 1. Enforce mutual friendship
      const [user_a_id, user_b_id] = [senderId, targetId].sort();
      const friendship = await prisma.friendship.findUnique({
        where: {
          user_a_id_user_b_id: { user_a_id, user_b_id },
          status: "ACCEPTED",
        },
      });

      if (!friendship) {
        throw new AppError(403, "You must be mutual friends to send direct messages");
      }
    } else {
      // 2. Enforce group membership
      const membership = await prisma.groupMember.findUnique({
        where: {
          group_id_user_id: {
            group_id: targetId,
            user_id: senderId,
          },
        },
      });

      if (!membership) {
        throw new AppError(403, "You must be a member of the group to send messages");
      }
    }

    // Save message to database
    const message = await prisma.message.create({
      data: {
        sender_id: senderId,
        target_id: targetId,
        target_type: targetType,
        content,
      },
    });

    res.status(201).json({
      status: "success",
      message,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDMHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params; // The other user's id
    const currentUserId = req.user!.user_id;
    const { cursor, limit = "50" } = req.query;

    const parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new AppError(400, "Invalid limit parameter");
    }

    // Enforce mutual friendship
    const [user_a_id, user_b_id] = [currentUserId, userId].sort();
    const friendship = await prisma.friendship.findUnique({
      where: {
        user_a_id_user_b_id: { user_a_id, user_b_id },
        status: "ACCEPTED",
      },
    });

    if (!friendship) {
      throw new AppError(403, "You must be mutual friends to access chat history");
    }

    // Query messages with cursor-based pagination
    const messages = await prisma.message.findMany({
      where: {
        target_type: "DM",
        OR: [
          { sender_id: currentUserId, target_id: userId },
          { sender_id: userId, target_id: currentUserId },
        ],
        // If cursor is provided, load messages created BEFORE the cursor timestamp
        ...(cursor && {
          timestamp: {
            lt: new Date(cursor as string),
          },
        }),
      },
      orderBy: {
        timestamp: "desc",
      },
      take: parsedLimit,
    });

    // Reverse messages to return them in chronological order
    const chronologicalMessages = [...messages].reverse();

    // Determine the next cursor (the timestamp of the oldest message fetched in this batch)
    const nextCursor = messages.length === parsedLimit ? messages[messages.length - 1].timestamp : null;

    res.status(200).json({
      status: "success",
      messages: chronologicalMessages,
      nextCursor,
    });
  } catch (error) {
    next(error);
  }
}

export async function getGroupHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user!.user_id;
    const { cursor, limit = "50" } = req.query;

    const parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new AppError(400, "Invalid limit parameter");
    }

    // 1. Verify current user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id: currentUserId,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, "Access denied: You must join the group to view message logs");
    }

    // 2. Query messages
    const messages = await prisma.message.findMany({
      where: {
        target_id: groupId,
        target_type: "GROUP",
        ...(cursor && {
          timestamp: {
            lt: new Date(cursor as string),
          },
        }),
      },
      orderBy: {
        timestamp: "desc",
      },
      take: parsedLimit,
    });

    // 3. Return chronological order
    const chronologicalMessages = [...messages].reverse();
    const nextCursor = messages.length === parsedLimit ? messages[messages.length - 1].timestamp : null;

    res.status(200).json({
      status: "success",
      messages: chronologicalMessages,
      nextCursor,
    });
  } catch (error) {
    next(error);
  }
}
