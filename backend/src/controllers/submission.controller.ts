import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { getRoomByCode, verifyRoomHost } from "../services/room.service";
import {
  submitCode,
  getSubmission,
  getRoomSubmissions,
  getParticipantSubmissions,
} from "../services/submission.service";

export const submit = async (req: Request, res: Response): Promise<void> => {
  const { roomCode, problemId, participantName, language, code } = req.body;

  if (!roomCode || !problemId || !participantName || !language || !code) {
    res.status(400).json({
      error:
        "roomCode, problemId, participantName, language and code are required",
    });
    return;
  }

  const validLanguages = ["cpp", "c", "java", "python", "javascript"];
  if (!validLanguages.includes(language)) {
    res
      .status(400)
      .json({ error: `Language must be one of: ${validLanguages.join(", ")}` });
    return;
  }

  try {
    const submission = await submitCode(
      roomCode,
      problemId,
      participantName,
      language,
      code,
    );
    res.status(201).json({ submissionId: submission.id, status: "queued" });
  } catch (err: unknown) {
    if (err instanceof Error) {
      const clientErrors = [
        "Room not found",
        "Contest is not active",
        "Already solved",
        "Problem not found",
      ];
      if (clientErrors.includes(err.message)) {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getVerdict = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  try {
    const submission = await getSubmission(id);
    res.json({ submission });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Submission not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listRoomSubmissions = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code } = req.params;
  try {
    const room = await getRoomByCode(code);
    const isHost = await verifyRoomHost(code, req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Hosts only" });
      return;
    }
    const submissions = await getRoomSubmissions(room.id);
    res.json({ submissions });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listParticipantSubmissions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { code, name } = req.params;
  try {
    const room = await getRoomByCode(code);
    const submissions = await getParticipantSubmissions(room.id, name);
    res.json({ submissions });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
