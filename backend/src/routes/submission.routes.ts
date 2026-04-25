import { Router } from "express";
import {
  submit,
  getVerdict,
  listRoomSubmissions,
  listParticipantSubmissions,
} from "../controllers/submission.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/", submit);
router.get("/:id", getVerdict);

export default router;
