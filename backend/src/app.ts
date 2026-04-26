import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db";
import redis from "./config/redis";

import authRoutes from "./routes/auth.routes";
import roomRoutes from "./routes/room.routes";
import problemRoutes from "./routes/problem.routes";
import submissionRoutes from "./routes/submission.routes";
import { runCode } from "./controllers/run.controller";

import { authenticate } from "./middleware/auth.middleware";

import {
  timerStart,
  timerPause,
  timerResume,
} from "./controllers/room.controller";

import { startVerdictListener } from "./queue/verdict.listener";
import {
  listRoomSubmissions,
  listParticipantSubmissions,
} from "./controllers/submission.controller";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    await redis.ping();
    res.json({
      status: "ok",
      message: "Dojo API is running",
      db: "connected",
      redis: "connected",
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Connection failed" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/rooms/:code/problems", problemRoutes);

app.post("/api/rooms/:code/timer/start", authenticate, timerStart);
app.post("/api/rooms/:code/timer/pause", authenticate, timerPause);
app.post("/api/rooms/:code/timer/resume", authenticate, timerResume);

app.use("/api/submissions", submissionRoutes);
app.get("/api/rooms/:code/submissions", authenticate, listRoomSubmissions);
app.get("/api/rooms/:code/submissions/:name", listParticipantSubmissions);

app.post("/api/run", runCode);

startVerdictListener();

export default app;
