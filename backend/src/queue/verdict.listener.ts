import redis from "../config/redis";
import pool from "../config/db";
import { getIO } from "../socket";
import { updateLeaderboard } from "../services/leaderboard.service";

const getLeaderboard = async (roomCode: string) => {
  const raw = await redis.zrange(
    `room:${roomCode}:leaderboard`,
    0,
    -1,
    "WITHSCORES",
  );
  const leaderboard: any[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    leaderboard.push(JSON.parse(raw[i]));
  }
  return leaderboard;
};

export const startVerdictListener = () => {
  const sub = redis.duplicate();

  sub.subscribe("pubsub:verdict", (err) => {
    if (err) {
      console.error("Failed to subscribe to pubsub:verdict", err);
      return;
    }
  });

  sub.on("message", async (_channel, message) => {
    try {
      const verdict = JSON.parse(message);
      const {
        submissionId,
        roomCode,
        participantName,
        status,
        score,
        timeTaken,
        memoryUsed,
        results,
      } = verdict;

      await pool.query(
        `UPDATE submissions 
         SET status = $1, score = $2, time_taken = $3, memory_used = $4
         WHERE id = $5`,
        [status, score, timeTaken, memoryUsed, submissionId],
      );

      if (results && results.length > 0) {
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

      const problemResult = await pool.query(
        "SELECT title FROM problems WHERE id = $1",
        [verdict.problemId],
      );
      const problemTitle = problemResult.rows[0]?.title || "Unknown";

      io.to(`room:${verdict.roomCode}`).emit("submission_update", {
        submissionId: verdict.submissionId,
        participantName: verdict.participantName,
        problemTitle,
        status: verdict.status,
        score: verdict.score,
      });

      const leaderboard = await getLeaderboard(roomCode);
      io.to(`room:${roomCode}`).emit("leaderboard_update", { leaderboard });
    } catch (err) {
      console.error("Verdict processing error:", err);
    }
  });
};
