import axios from "axios";

interface RunRequest {
  language: string;
  code: string;
  input: string;
  timeLimit: number;
  memoryLimit: number;
}

export interface RunResult {
  output: string;
  error: string;
}

export const executeCode = async (payload: RunRequest): Promise<RunResult> => {
  try {
    const response = await axios.post<RunResult>(
      `${process.env.JUDGE_URL || "http://localhost:5001"}/run`,
      payload,
      { timeout: 15000 },
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.code === "ECONNREFUSED") {
      throw new Error("Judge service unavailable");
    }
    throw new Error("Code execution failed");
  }
};
