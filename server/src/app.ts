import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { globalLimiter } from "./middleware/rateLimiter";
import { requestId, requestLogger } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import friendshipRoutes from "./routes/friendship.routes";
import messageRoutes from "./routes/message.routes";
import userRoutes from "./routes/user.routes";
import groupRoutes from "./routes/group.routes";
import spotifyRoutes from "./routes/spotify.routes";
import adminRoutes from "./routes/admin.routes";
import pollRoutes from "./routes/poll.routes";

dotenv.config();

const app = express();

// Request ID and logging (top of middleware stack)
app.use(requestId);
app.use(requestLogger);

// Global security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://i.scdn.co"],
        connectSrc: ["'self'", "wss:", "https://api.spotify.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// CORS setup
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [process.env.CLIENT_URL || "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Health Check API (exempt from rate limits if needed, but currently placed under global)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is healthy",
    timestamp: new Date(),
    service: "klconnect-api",
  });
});

// Apply rate limiter to all API endpoints
app.use("/api", globalLimiter);

// Auth Routes
app.use("/api/auth", authRoutes);

// User Routes
app.use("/api/users", userRoutes);

// Friendship Routes
app.use("/api/friendships", friendshipRoutes);

// Message Routes
app.use("/api/messages", messageRoutes);

// Group Routes
app.use("/api/groups", groupRoutes);

// Spotify Routes
app.use("/api/spotify", spotifyRoutes);

// Admin Routes
app.use("/api/admin", adminRoutes);

// Poll Routes
app.use("/api/polls", pollRoutes);

// Error Handling Middleware
app.use(errorHandler);

export default app;
