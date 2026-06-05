import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = crypto.randomUUID();
  (req as any).requestId = id;
  res.setHeader("X-Request-ID", id);
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const id = (req as any).requestId || "-";
    console.log(`[${id}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
}
