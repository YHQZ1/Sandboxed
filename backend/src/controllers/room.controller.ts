import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  createRoom,
  getRoomByCode,
  joinRoom,
  getRoomParticipants,
  removeParticipant,
  verifyRoomHost,
  getRoomWithProblems,
} from "../services/room.service";

export const create = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { name, timerDuration } = req.body;

  if (!name) {
    res.status(400).json({ error: "Room name is required" });
    return;
  }

  try {
    const room = await createRoom(req.user!.userId, name, timerDuration);
    res.status(201).json({ room });
  } catch (err) {
    console.error("Create room error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getRoom = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params;
  try {
    const room = await getRoomWithProblems(code.toUpperCase());
    const participants = await getRoomParticipants(code.toUpperCase());
    res.json({ room, participants, problems: room.problems });
  } catch (err: any) {
    if (err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error("Get room error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const join = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params;
  const { name, role } = req.body;

  if (!name || !role) {
    res.status(400).json({ error: "Name and role are required" });
    return;
  }

  if (!["host", "participant", "viewer"].includes(role)) {
    res
      .status(400)
      .json({ error: "Role must be host, participant, or viewer" });
    return;
  }

  let userId: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const jwt = await import("jsonwebtoken");
      const payload = jwt.default.verify(
        authHeader.slice(7),
        process.env.JWT_SECRET as string,
      ) as any;
      userId = payload.userId;
    } catch {
      // Token invalid, continue without userId
    }
  }

  if (role === "host" && !userId) {
    res.status(401).json({ error: "Hosts must provide a valid JWT" });
    return;
  }

  try {
    const data = await joinRoom(code.toUpperCase(), name, role, userId);
    res.json(data);
  } catch (err: any) {
    const clientErrors = [
      "Room not found",
      "Contest has ended",
      "Hosts must be authenticated",
      "Name already taken in this room",
    ];
    if (clientErrors.includes(err.message)) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("Join room error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const kick = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, name } = req.params;

  try {
    const isHost = await verifyRoomHost(code.toUpperCase(), req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Only hosts can remove participants" });
      return;
    }

    await removeParticipant(code.toUpperCase(), name);
    res.json({ message: `${name} removed from room` });
  } catch (err: any) {
    if (err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error("Kick error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const timerStart = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code } = req.params;
  try {
    const isHost = await verifyRoomHost(code.toUpperCase(), req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Hosts only" });
      return;
    }
    res.json({ message: "Send timer_start via WebSocket" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const timerPause = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code } = req.params;
  try {
    const isHost = await verifyRoomHost(code.toUpperCase(), req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Hosts only" });
      return;
    }
    res.json({ message: "Send timer_pause via WebSocket" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const timerResume = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code } = req.params;
  try {
    const isHost = await verifyRoomHost(code.toUpperCase(), req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Hosts only" });
      return;
    }
    res.json({ message: "Send timer_resume via WebSocket" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
