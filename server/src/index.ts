import http from "http";
import app from "./app";
import prisma from "./config/db";
import redisClient, { connectRedis } from "./config/redis";
import { getJWTKeys } from "./config/keys";
import { initSocketServer } from "./socket";

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    console.log("🚀 Starting KL Connect Backend Bootstrap...");

    // 1. Initialize and verify JWT keys (auto-generates if missing)
    getJWTKeys();

    // 2. Connect to Redis Cache Store (Non-blocking)
    console.log("🔌 Connecting to Redis in background...");
    connectRedis().catch((redisErr: any) => {
      console.warn("⚠️ Redis initial connection error:", redisErr.message || redisErr);
    });

    // 3. Connect to PostgreSQL DB via Prisma
    console.log("🔌 Connecting to PostgreSQL...");
    await prisma.$connect();
    console.log("🟢 Database connected successfully");

    // 4. Create HTTP server and bind Socket.io
    const httpServer = http.createServer(app);
    initSocketServer(httpServer);

    const server = httpServer.listen(PORT, () => {
      console.log(`🟢 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    });

    // Graceful Shutdown Handler
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(() => {
        console.log("🟢 HTTP server closed");
      });

      try {
        await prisma.$disconnect();
        console.log("🟢 Database connection closed");
      } catch (err) {
        console.error("🔴 Error closing database connection:", err);
      }

      try {
        if (redisClient.isOpen) {
          await redisClient.quit();
          console.log("🟢 Redis connection closed");
        }
      } catch (err) {
        console.error("🔴 Error closing Redis connection:", err);
      }

      console.log("👋 Graceful shutdown complete. Exiting.");
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    console.error("💥 Bootstrap Failed:", error);
    process.exit(1);
  }
}

bootstrap();
