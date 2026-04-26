import { Response } from "express";
import { getIO } from "../socket";
import { AuthRequest } from "../middleware/auth.middleware";
import { verifyRoomHost, getRoomByCode } from "../services/room.service";
import {
  createProblem,
  getProblems,
  getProblemById,
  getPublicProblems,
  updateProblem,
  deleteProblem,
  addTestCase,
  deleteTestCase,
} from "../services/problem.service";

export const list = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code } = req.params;

  try {
    const room = await getRoomByCode(code);

    let problems;
    if (req.user) {
      const isHost = await verifyRoomHost(code, req.user.userId);
      problems = isHost
        ? await getProblems(room.id)
        : await getPublicProblems(room.id);
    } else {
      problems = await getPublicProblems(room.id);
    }

    res.json({ problems });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const create = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code } = req.params;
  const {
    title,
    description,
    input_format,
    output_format,
    constraints,
    points,
    time_limit,
    memory_limit,
  } = req.body;

  if (!title || !description) {
    res.status(400).json({ error: "Title and description are required" });
    return;
  }

  try {
    const room = await getRoomByCode(code);
    const isHost = await verifyRoomHost(code, req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Only hosts can add problems" });
      return;
    }

    const problem = await createProblem(room.id, {
      title,
      description,
      input_format,
      output_format,
      constraints,
      points,
      time_limit,
      memory_limit,
    });
    getIO().to(`room:${code}`).emit("problem_added", { problem });
    res.status(201).json({ problem });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const update = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code, id } = req.params;

  try {
    const isHost = await verifyRoomHost(code, req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Only hosts can update problems" });
      return;
    }

    const problem = await updateProblem(id, req.body);
    res.json({ problem });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (
        err.message === "Problem not found" ||
        err.message === "Room not found"
      ) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.message === "Nothing to update") {
        res.status(400).json({ error: err.message });
        return;
      }
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const remove = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code, id } = req.params;

  try {
    const isHost = await verifyRoomHost(code, req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Only hosts can delete problems" });
      return;
    }

    await deleteProblem(id);
    res.json({ message: "Problem deleted" });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Problem not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addTC = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, id } = req.params;
  const { input, expected_output, is_sample } = req.body;

  if (!input || !expected_output) {
    res.status(400).json({ error: "Input and expected_output are required" });
    return;
  }

  try {
    const isHost = await verifyRoomHost(code, req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Only hosts can add test cases" });
      return;
    }

    const testCase = await addTestCase(
      id,
      input,
      expected_output,
      is_sample ?? false,
    );

    const updatedProblem = await getProblemById(id);
    getIO()
      .to(`room:${code}`)
      .emit("problem_updated", { problem: updatedProblem });

    res.status(201).json({ testCase });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeTC = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code, tcId } = req.params;

  try {
    const isHost = await verifyRoomHost(code, req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Only hosts can delete test cases" });
      return;
    }

    await deleteTestCase(tcId);
    res.json({ message: "Test case deleted" });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Test case not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
