import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/postgres";
import redis from "./config/redis";

import authRoutes from "./routes/auth.routes";
import roomRoutes from "./routes/room.routes";
import problemRoutes from "./routes/problem.routes";
import submissionRoutes from "./routes/submission.routes";
import runRoutes from "./routes/run.routes";

import { startVerdictListener } from "./queue/verdict.listener";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    await redis.ping();
    res.json({ status: "ok", db: "connected", redis: "connected" });
  } catch {
    res.status(500).json({ status: "error", message: "Service unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/rooms/:code/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/run", runRoutes);

startVerdictListener();

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
