import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  createRoom,
  getRoomByCode,
  joinRoom,
  getRoomParticipants,
  removeParticipant,
  verifyRoomHost,
} from "../services/room.service";
import { getPublicProblems, getProblems } from "../services/problem.service";

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
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getRoom = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code } = req.params;

  try {
    const room = await getRoomByCode(code);
    const participants = await getRoomParticipants(code);

    let problems;
    if (req.user) {
      const isHost = await verifyRoomHost(code, req.user.userId);
      problems = isHost
        ? await getProblems(room.id)
        : await getPublicProblems(room.id);
    } else {
      problems = await getPublicProblems(room.id);
    }

    res.json({ room, participants, problems });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
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
      const payload = jwt.verify(
        authHeader.slice(7),
        process.env.JWT_SECRET as string,
      ) as { userId: string };
      userId = payload.userId;
    } catch {
      // token invalid, proceed without userId
    }
  }

  if (role === "host" && !userId) {
    res.status(401).json({ error: "Hosts must provide a valid JWT" });
    return;
  }

  try {
    const data = await joinRoom(code, name, role, userId);
    res.json(data);
  } catch (err: unknown) {
    if (err instanceof Error) {
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
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const kick = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, name } = req.params;

  try {
    const isHost = await verifyRoomHost(code, req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Only hosts can remove participants" });
      return;
    }

    await removeParticipant(code, name);
    res.json({ message: `${name} removed from room` });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
