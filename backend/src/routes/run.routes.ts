import { Router } from "express";
import { runCode } from "../controllers/run.controller";

const router = Router();

router.post("/", runCode);

export default router;
