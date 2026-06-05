import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function logAdminAction(
  adminId: string,
  action: string,
  targetId?: string,
  details?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        admin_id: adminId,
        action,
        target_id: targetId || null,
        details: details || undefined,
      },
    });
  } catch (error) {
    // Log but don't fail the main operation
    console.error("[AuditLog] Failed to record action:", error);
  }
}
