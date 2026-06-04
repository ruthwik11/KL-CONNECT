import { Router } from "express";
import {
  createGroup,
  listPublicGroups,
  joinGroup,
  leaveGroup,
  listGroupMembers,
  listMyJoinedGroups,
} from "../controllers/group.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Protect all group channel endpoints
router.use(authenticate);

router.post("/", createGroup);
router.get("/public", listPublicGroups);
router.get("/my", listMyJoinedGroups);
router.post("/:id/join", joinGroup);
router.delete("/:id/leave", leaveGroup);
router.get("/:id/members", listGroupMembers);

export default router;
