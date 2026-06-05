import { Router } from "express";
import { sendMessage, getDMHistory, getGroupHistory } from "../controllers/message.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Apply auth protection to all messaging routes
router.use(authenticate);

router.post("/", sendMessage);
router.get("/dm/:userId", getDMHistory);
router.get("/group/:groupId", getGroupHistory);

export default router;
