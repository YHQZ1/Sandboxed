import { Router } from "express";
import {
  create,
  getRoom,
  join,
  kick,
  getLeaderboard,
} from "../controllers/room.controller";
import {
  listRoomSubmissions,
  listParticipantSubmissions,
} from "../controllers/submission.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, create);
router.get("/:code", getRoom);
router.post("/:code/join", join);
router.delete("/:code/participants/:name", authenticate, kick);
router.get("/:code/leaderboard", getLeaderboard);
router.get("/:code/submissions", authenticate, listRoomSubmissions);
router.get("/:code/submissions/:name", listParticipantSubmissions);

export default router;
