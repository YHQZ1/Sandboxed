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
router.get("/room/:code", authenticate, listRoomSubmissions);
router.get("/room/:code/participant/:name", listParticipantSubmissions);

export default router;
