import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { z } from "zod";

// Middleware factory
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: (error as any).errors.map((e: any) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

// Schemas
export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  username: z.string().regex(/^[a-zA-Z0-9_]{3,32}$/, "Username must be 3-32 alphanumeric characters or underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const sendOTPSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email format"),
  code: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d{6}$/, "OTP must be numeric"),
});

export const sendMessageSchema = z.object({
  targetId: z.string().uuid("Invalid target ID"),
  targetType: z.enum(["DM", "GROUP"]),
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message must be under 5000 characters"),
});

export const exportLogsSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export const provisionUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  username: z.string().regex(/^[a-zA-Z0-9_]{3,32}$/, "Username must be 3-32 alphanumeric characters or underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["USER", "ADMIN"]),
});
