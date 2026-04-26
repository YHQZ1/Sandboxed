import { Request, Response } from "express";
import { executeCode } from "../services/run.service";
import { getRoomByCode } from "../services/room.service";
import redis from "../config/redis";

export const runCode = async (req: Request, res: Response): Promise<void> => {
  const {
    language,
    code,
    input,
    timeLimit,
    memoryLimit,
    roomCode,
    participantName,
  } = req.body;

  if (!language || !code) {
    res.status(400).json({ error: "Language and code are required" });
    return;
  }

  if (!roomCode || !participantName) {
    res
      .status(400)
      .json({ error: "roomCode and participantName are required" });
    return;
  }

  const validLanguages = ["cpp", "c", "java", "python", "javascript"];
  if (!validLanguages.includes(language)) {
    res.status(400).json({ error: "Invalid language" });
    return;
  }

  try {
    const room = await getRoomByCode(roomCode);
    if (room.status !== "active") {
      res.status(403).json({ error: "Contest is not active" });
      return;
    }

    const participant = await redis.hget(
      `room:${roomCode}:participants`,
      participantName,
    );
    if (!participant) {
      res.status(403).json({ error: "Participant not found in room" });
      return;
    }

    const result = await executeCode({
      language,
      code,
      input: input || "",
      timeLimit: timeLimit || 5,
      memoryLimit: memoryLimit || 256,
    });
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Judge service unavailable") {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message === "Room not found") {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
