import { Router } from "express";
import { authorize, callback } from "../controllers/spotify.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// /authorize requires authentication to retrieve authorization URL
router.get("/authorize", authenticate, authorize);

// /callback is accessed publicly as the OAuth redirection callback
router.get("/callback", callback);

export default router;
