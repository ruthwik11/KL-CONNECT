import { Router } from "express";
import {
  listUsers,
  toggleUserSuspension,
  deleteUser,
  exportAuditLogs,
  purgeOldMessages,
} from "../controllers/admin.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Apply complete admin protection across the whole routing router
router.use(authenticate);
router.use(requireRole("ADMIN"));

router.get("/users", listUsers);
router.patch("/users/:id/suspend", toggleUserSuspension);
router.delete("/users/:id", deleteUser);
router.post("/export", exportAuditLogs);
router.post("/purge", purgeOldMessages); // Emitted via post to support confirmation payload

export default router;
