import { Router } from "express";
import {
  getMe,
  searchUsers,
  getUserProfile,
  updateStatus,
  unlinkSpotify,
  updateUsername,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Protect all user profile endpoints
router.use(authenticate);

router.get("/me", getMe);
router.patch("/me/status", updateStatus);
router.patch("/me/username", updateUsername);
router.delete("/me/spotify", unlinkSpotify);
router.get("/search", searchUsers);
router.get("/:id", getUserProfile);

export default router;
