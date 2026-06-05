import { Router } from "express";
import {
  createGroup,
  listPublicGroups,
  joinGroup,
  leaveGroup,
  listGroupMembers,
  listMyJoinedGroups,
} from "../controllers/group.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Protect all group channel endpoints
router.use(authenticate);

router.post("/", requireRole("ADMIN"), createGroup);
router.get("/public", listPublicGroups);
router.get("/my", listMyJoinedGroups);
router.post("/:id/join", joinGroup);
router.delete("/:id/leave", leaveGroup);
router.get("/:id/members", listGroupMembers);

export default router;
