import { Router } from "express";
import {
  createPoll,
  getTodayPoll,
  castVote,
  getPollResults,
} from "../controllers/poll.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Retrieve today's active poll, cast a vote, and view results are open to authenticated users
router.get("/today", authenticate, getTodayPoll);
router.post("/:id/vote", authenticate, castVote);
router.get("/:id/results", authenticate, getPollResults);

// Create poll is restricted to administrative clearance only
router.post("/", authenticate, requireRole("ADMIN"), createPoll);

export default router;
