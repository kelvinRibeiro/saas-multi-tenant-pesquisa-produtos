import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { chat } from "../controllers/chat.controller";

const router = Router();

router.post("/", authenticate, asyncHandler(chat));

export default router;
