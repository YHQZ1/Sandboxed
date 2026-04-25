import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { verifyRoomHost, getRoomByCode } from "../services/room.service";
import {
  createProblem,
  getProblems,
  getPublicProblems,
  getProblemById,
  updateProblem,
  deleteProblem,
  addTestCase,
  deleteTestCase,
} from "../services/problem.service";

// GET /api/rooms/:code/problems
export const list = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code } = req.params;

  try {
    const room = await getRoomByCode(code.toUpperCase());

    // if authenticated and a host → return all test cases
    // otherwise → sample only
    let problems;
    if (req.user) {
      const isHost = await verifyRoomHost(code.toUpperCase(), req.user.userId);
      problems = isHost
        ? await getProblems(room.id)
        : await getPublicProblems(room.id);
    } else {
      problems = await getPublicProblems(room.id);
    }

    res.json({ problems });
  } catch (err: any) {
    if (err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error("List problems error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/rooms/:code/problems
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
    const room = await getRoomByCode(code.toUpperCase());
    const isHost = await verifyRoomHost(code.toUpperCase(), req.user!.userId);
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
    res.status(201).json({ problem });
  } catch (err: any) {
    if (err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error("Create problem error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/rooms/:code/problems/:id
export const update = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code, id } = req.params;

  try {
    const isHost = await verifyRoomHost(code.toUpperCase(), req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Only hosts can update problems" });
      return;
    }

    const problem = await updateProblem(id, req.body);
    res.json({ problem });
  } catch (err: any) {
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
    console.error("Update problem error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/rooms/:code/problems/:id
export const remove = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code, id } = req.params;

  try {
    const isHost = await verifyRoomHost(code.toUpperCase(), req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Only hosts can delete problems" });
      return;
    }

    await deleteProblem(id);
    res.json({ message: "Problem deleted" });
  } catch (err: any) {
    if (err.message === "Problem not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error("Delete problem error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/rooms/:code/problems/:id/testcases
export const addTC = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, id } = req.params;
  const { input, expected_output, is_sample } = req.body;

  if (!input || !expected_output) {
    res.status(400).json({ error: "Input and expected_output are required" });
    return;
  }

  try {
    const isHost = await verifyRoomHost(code.toUpperCase(), req.user!.userId);
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
    res.status(201).json({ testCase });
  } catch (err: any) {
    if (err.message === "Room not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error("Add test case error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/rooms/:code/problems/:id/testcases/:tcId
export const removeTC = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { code, tcId } = req.params;

  try {
    const isHost = await verifyRoomHost(code.toUpperCase(), req.user!.userId);
    if (!isHost) {
      res.status(403).json({ error: "Only hosts can delete test cases" });
      return;
    }

    await deleteTestCase(tcId);
    res.json({ message: "Test case deleted" });
  } catch (err: any) {
    if (err.message === "Test case not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error("Delete test case error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
