import { Router } from "express";
import { submit, getVerdict } from "../controllers/submission.controller";

const router = Router();

router.post("/", submit);
router.get("/:id", getVerdict);

export default router;
