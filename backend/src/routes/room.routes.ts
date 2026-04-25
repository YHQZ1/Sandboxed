import { Router } from "express";
import { create, getRoom, join, kick } from "../controllers/room.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, create);
router.get("/:code", getRoom);
router.post("/:code/join", join);
router.delete("/:code/participants/:name", authenticate, kick);

export default router;
