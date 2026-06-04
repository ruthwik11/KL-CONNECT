import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { AppError } from "../utils/errors";

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, is_public = true } = req.body;
    const userId = req.user!.user_id;

    if (!name || typeof name !== "string") {
      throw new AppError(400, "Group name is required");
    }

    const cleanName = name.trim();
    if (cleanName.length < 3 || cleanName.length > 64) {
      throw new AppError(400, "Group name must be between 3 and 64 characters");
    }

    // Create group and auto-join the creator
    const group = await prisma.group.create({
      data: {
        name: cleanName,
        is_public,
        created_by: userId,
        members: {
          create: {
            user_id: userId,
          },
        },
      },
      include: {
        creator: {
          select: {
            user_id: true,
            username: true,
          },
        },
      },
    });

    res.status(201).json({
      status: "success",
      message: "Group created and joined successfully",
      group,
    });
  } catch (error) {
    next(error);
  }
}

export async function listPublicGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const groups = await prisma.group.findMany({
      where: { is_public: true },
      include: {
        creator: {
          select: {
            user_id: true,
            username: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.status(200).json({
      status: "success",
      groups: groups.map((g) => ({
        group_id: g.group_id,
        name: g.name,
        is_public: g.is_public,
        created_at: g.created_at,
        creator: g.creator,
        memberCount: g._count.members,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function joinGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // Group ID
    const userId = req.user!.user_id;

    const group = await prisma.group.findUnique({
      where: { group_id: id },
    });

    if (!group) {
      throw new AppError(404, "Group channel not found");
    }

    if (!group.is_public) {
      throw new AppError(403, "Cannot join private group channels directly");
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: id,
          user_id: userId,
        },
      },
    });

    if (existingMember) {
      throw new AppError(409, "You are already a member of this group");
    }

    const membership = await prisma.groupMember.create({
      data: {
        group_id: id,
        user_id: userId,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Joined group channel successfully",
      membership,
    });
  } catch (error) {
    next(error);
  }
}

export async function leaveGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // Group ID
    const userId = req.user!.user_id;

    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: id,
          user_id: userId,
        },
      },
    });

    if (!membership) {
      throw new AppError(404, "You are not a member of this group");
    }

    await prisma.groupMember.delete({
      where: {
        id: membership.id,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Left group channel successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function listGroupMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // Group ID
    const userId = req.user!.user_id;

    // Verify current user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: id,
          user_id: userId,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, "Access denied: You must join the group to view members");
    }

    const members = await prisma.groupMember.findMany({
      where: { group_id: id },
      include: {
        user: {
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

    res.status(200).json({
      status: "success",
      members: members.map((m) => m.user),
    });
  } catch (error) {
    next(error);
  }
}

export async function listMyJoinedGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.user_id;

    const memberships = await prisma.groupMember.findMany({
      where: { user_id: userId },
      include: {
        group: {
          include: {
            creator: {
              select: {
                user_id: true,
                username: true,
              },
            },
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joined_at: "desc" },
    });

    res.status(200).json({
      status: "success",
      groups: memberships.map((m) => ({
        group_id: m.group.group_id,
        name: m.group.name,
        is_public: m.group.is_public,
        created_at: m.group.created_at,
        creator: m.group.creator,
        memberCount: m.group._count.members,
        joined_at: m.joined_at,
      })),
    });
  } catch (error) {
    next(error);
  }
}
