import { Router } from "express";
import { sendMessage, getDMHistory, getGroupHistory } from "../controllers/message.controller";
import { authenticate } from "../middleware/auth.middleware";
import { messageLimiter } from "../middleware/rateLimiter";
import { validate, sendMessageSchema } from "../middleware/validation";

const router = Router();

// Apply auth protection to all messaging routes
router.use(authenticate);

router.post("/", messageLimiter, validate(sendMessageSchema), sendMessage);
router.get("/dm/:userId", getDMHistory);
router.get("/group/:groupId", getGroupHistory);

export default router;
