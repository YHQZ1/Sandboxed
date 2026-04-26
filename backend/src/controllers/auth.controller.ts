import { Request, Response } from "express";
import { registerUser, loginUser, getUserById } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password are required" });
    return;
  }

  try {
    const data = await registerUser(name, email, password);
    res.status(201).json(data);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Email already registered") {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const data = await loginUser(email, password);
    res.json(data);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Invalid credentials") {
      res.status(401).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await getUserById(req.user!.userId);
    res.json({ user });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "User not found") {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
