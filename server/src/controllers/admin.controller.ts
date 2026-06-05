import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { AppError } from "../utils/errors";
import { disconnectUser } from "../socket";

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, page = "1", limit = "20" } = req.query;
    
    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);

    if (isNaN(parsedPage) || parsedPage <= 0 || isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new AppError(400, "Invalid pagination parameters");
    }

    const offset = (parsedPage - 1) * parsedLimit;

    // Filter by username search query if present
    const whereClause = q
      ? {
          username: {
            contains: q as string,
            mode: "insensitive" as const,
          },
        }
      : {};

    const [users, totalCount] = await prisma.$transaction([
      prisma.user.findMany({
        where: whereClause,
        select: {
          user_id: true,
          username: true,
          email: true,
          role: true,
          is_verified: true,
          is_suspended: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        skip: offset,
        take: parsedLimit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / parsedLimit);

    res.status(200).json({
      status: "success",
      users,
      pagination: {
        totalUsers: totalCount,
        totalPages,
        currentPage: parsedPage,
        limit: parsedLimit,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserSuspension(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { user_id: id },
    });

    if (!user) {
      throw new AppError(404, "User account not found");
    }

    if (user.role === "ADMIN") {
      throw new AppError(400, "Administrators cannot be suspended");
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: id },
      data: { is_suspended: !user.is_suspended },
    });

    // If suspended, force-disconnect active socket client sessions
    if (updatedUser.is_suspended) {
      disconnectUser(id);
    }

    res.status(200).json({
      status: "success",
      is_suspended: updatedUser.is_suspended,
      message: updatedUser.is_suspended ? "User suspended successfully" : "User unsuspended successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { user_id: id },
    });

    if (!user) {
      throw new AppError(404, "User account not found");
    }

    if (user.role === "ADMIN") {
      throw new AppError(400, "Administrators cannot be deleted");
    }

    // Terminate all socket links before deleting
    disconnectUser(id);

    // Hard delete user (cascades memberships, messages, votes, etc. automatically)
    await prisma.user.delete({
      where: { user_id: id },
    });

    res.status(200).json({
      status: "success",
      message: "Player account permanently purged from directory",
    });
  } catch (error) {
    next(error);
  }
}

export async function exportAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      throw new AppError(400, "Start date and End date are required for export range");
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    // Retrieve messages in range with sender information
    const messages = await prisma.message.findMany({
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      include: {
        sender: {
          select: {
            username: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Raw CSV Compilation
    const headers = ["message_id", "sender_username", "sender_email", "target_id", "target_type", "content", "timestamp"];
    const rows = [headers.join(",")];

    for (const msg of messages) {
      const sanitizedContent = msg.content.replace(/"/g, '""');
      const values = [
        msg.msg_id,
        msg.sender.username,
        msg.sender.email,
        msg.target_id,
        msg.target_type,
        `"${sanitizedContent}"`,
        msg.timestamp.toISOString(),
      ];
      rows.push(values.join(","));
    }

    const csvString = rows.join("\n");

    // Send direct attachment stream response
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=chat_audit_logs_${Date.now()}.csv`);
    
    res.status(200).send(csvString);
  } catch (error) {
    next(error);
  }
}

export async function purgeOldMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { confirm } = req.body;
    
    if (confirm !== true) {
      throw new AppError(400, "Purge confirmation required");
    }

    // Cutoff calculation: 24 hours ago
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const deleted = await prisma.message.deleteMany({
      where: {
        timestamp: {
          lt: cutoff,
        },
      },
    });

    res.status(200).json({
      status: "success",
      purgedCount: deleted.count,
      message: `System governance purge completed. Permanent storage freed.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function listGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;

    const whereClause = q
      ? {
          name: {
            contains: q as string,
            mode: "insensitive" as const,
          },
        }
      : {};

    const groups = await prisma.group.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      status: "success",
      groups: groups.map((g) => ({
        group_id: g.group_id,
        name: g.name,
        created_at: g.created_at,
        creator: g.creator,
        memberCount: g._count.members,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { group_id: id },
    });

    if (!group) {
      throw new AppError(404, "Group channel not found");
    }

    // Hard delete group (cascades memberships, messages, etc.)
    await prisma.group.delete({
      where: { group_id: id },
    });

    res.status(200).json({
      status: "success",
      message: "Group channel permanently deleted and members ejected",
    });
  } catch (error) {
    next(error);
  }
}
