import { Router } from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectOrRemoveFriendship,
  listFriends,
  listPendingRequests,
} from "../controllers/friendship.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Apply auth protection to all friendship routes
router.use(authenticate);

router.post("/request", sendFriendRequest);
router.patch("/:id/accept", acceptFriendRequest);
router.delete("/:id", rejectOrRemoveFriendship);
router.get("/", listFriends);
router.get("/pending", listPendingRequests);

export default router;
