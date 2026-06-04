import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // Handle Prisma Client errors
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as any;
    if (prismaErr.code === "P2002") {
      const fields = prismaErr.meta?.target || ["field"];
      return res.status(409).json({
        status: "error",
        message: `Unique constraint failed on field: ${fields.join(", ")}`,
      });
    }
  }

  // Log unhandled non-operational errors
  console.error("💥 Unhandled Exception:", err);

  return res.status(500).json({
    status: "error",
    message: process.env.NODE_ENV === "development" ? err.message : "Internal Server Error",
  });
}
