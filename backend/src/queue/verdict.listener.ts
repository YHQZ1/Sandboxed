import redis from "../config/redis";
import pool from "../config/postgres";
import { getIO } from "../socket";
import { updateLeaderboard } from "../services/leaderboard.service";
import { enqueueSubmission } from "./submission.queue";

interface LeaderboardEntry {
  name: string;
  score: number;
  solvedCount: number;
  lastAcceptedAt: string | null;
}

const getLeaderboard = async (
  roomCode: string,
): Promise<LeaderboardEntry[]> => {
  const raw = await redis.zrange(
    `room:${roomCode}:leaderboard`,
    0,
    -1,
    "WITHSCORES",
  );
  const leaderboard: LeaderboardEntry[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    leaderboard.push(JSON.parse(raw[i]) as LeaderboardEntry);
  }
  return leaderboard;
};

const recoverStuckSubmissions = async () => {
  try {
    const result = await pool.query(
      `SELECT s.*, p.time_limit, p.memory_limit,
         json_agg(json_build_object(
           'id', tc.id,
           'input', tc.input,
           'expected_output', tc.expected_output
         ) ORDER BY tc.order_index) as test_cases
       FROM submissions s
       JOIN problems p ON p.id = s.problem_id
       LEFT JOIN test_cases tc ON tc.problem_id = p.id
       WHERE s.status = 'judging'
         AND s.submitted_at < NOW() - INTERVAL '2 minutes'
       GROUP BY s.id, p.time_limit, p.memory_limit
       LIMIT 10`,
    );

    for (const row of result.rows) {
      await enqueueSubmission({
        submissionId: row.id,
        roomCode: "",
        problemId: row.problem_id,
        participantName: row.participant_name,
        language: row.language,
        code: row.code,
        timeLimit: row.time_limit,
        memoryLimit: row.memory_limit,
        testCases: row.test_cases || [],
      });

      await pool.query(
        `UPDATE submissions SET status = 'queued' WHERE id = $1`,
        [row.id],
      );
    }
  } catch (err) {
    console.error(
      "[verdict] Recovery error:",
      err instanceof Error ? err.message : err,
    );
  }
};

export const startVerdictListener = () => {
  const sub = redis.duplicate();

  sub.subscribe("pubsub:verdict", (err) => {
    if (err) {
      console.error("[verdict] Subscription failed:", err.message);
    }
  });

  sub.on("message", async (_channel, message) => {
    try {
      const verdict = JSON.parse(message) as {
        submissionId: string;
        roomCode: string;
        problemId: string;
        participantName: string;
        status: string;
        score: number;
        timeTaken: number;
        memoryUsed: number;
        results?: Array<{
          testCaseId: string;
          status: string;
          timeTaken: number;
          memoryUsed: number;
          actualOutput: string;
        }>;
      };

      const {
        submissionId,
        roomCode,
        participantName,
        status,
        score,
        timeTaken,
        memoryUsed,
        results,
        problemId,
      } = verdict;

      await pool.query(
        `UPDATE submissions 
         SET status = $1, score = $2, time_taken = $3, memory_used = $4
         WHERE id = $5`,
        [status, score, timeTaken, memoryUsed, submissionId],
      );

      if (results?.length) {
        for (const r of results) {
          await pool.query(
            `INSERT INTO submission_results 
               (submission_id, test_case_id, status, time_taken, memory_used, actual_output)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              submissionId,
              r.testCaseId,
              r.status,
              r.timeTaken,
              r.memoryUsed,
              r.actualOutput,
            ],
          );
        }
      }

      if (status === "accepted") {
        await updateLeaderboard(roomCode, participantName, score, submissionId);
      }

      const io = getIO();

      io.to(`user:${participantName}:${roomCode}`).emit("verdict", {
        submissionId,
        status,
        score,
        timeTaken,
      });

      let problemTitle = "Unknown";
      try {
        const problemResult = await pool.query(
          "SELECT title FROM problems WHERE id = $1",
          [problemId],
        );
        problemTitle = problemResult.rows[0]?.title || "Unknown";
      } catch {
        // leave as "Unknown"
      }

      io.to(`room:${roomCode}`).emit("submission_update", {
        submissionId,
        participantName,
        problemTitle,
        status,
        score,
      });

      const leaderboard = await getLeaderboard(roomCode);
      io.to(`room:${roomCode}`).emit("leaderboard_update", { leaderboard });
    } catch (err) {
      console.error(
        "[verdict] Processing error:",
        err instanceof Error ? err.message : err,
      );
    }
  });

  setInterval(recoverStuckSubmissions, 60000);
};
