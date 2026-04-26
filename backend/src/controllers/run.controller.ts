import { Request, Response } from "express";
import axios from "axios";

export const runCode = async (req: Request, res: Response): Promise<void> => {
  const { language, code, input, timeLimit, memoryLimit } = req.body;

  if (!language || !code) {
    res.status(400).json({ error: "language and code are required" });
    return;
  }

  const validLanguages = ["cpp", "c", "java", "python", "javascript"];
  if (!validLanguages.includes(language)) {
    res.status(400).json({ error: "Invalid language" });
    return;
  }

  try {
    const judgeRes = await axios.post(
      `${process.env.JUDGE_URL || "http://localhost:5001"}/run`,
      {
        language,
        code,
        input: input || "",
        timeLimit: timeLimit || 5,
        memoryLimit: memoryLimit || 256,
      },
      { timeout: 15000 },
    );

    res.json(judgeRes.data);
  } catch (err: any) {
    if (err.code === "ECONNREFUSED") {
      res.status(503).json({ error: "Judge service unavailable" });
      return;
    }
    console.error("Run error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
