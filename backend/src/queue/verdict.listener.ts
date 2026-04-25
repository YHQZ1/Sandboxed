import redis from "../config/redis";
import pool from "../config/db";
import { getIO } from "../socket";
import { updateLeaderboard } from "../services/leaderboard.service";

export const startVerdictListener = () => {
  const sub = redis.duplicate();

  sub.subscribe("pubsub:verdict", (err) => {
    if (err) {
      console.error("Failed to subscribe to pubsub:verdict", err);
      return;
    }
    console.log("👂 Listening for verdicts on pubsub:verdict");
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
        results, // per test case results
      } = verdict;

      // update submission in postgres
      await pool.query(
        `UPDATE submissions 
         SET status = $1, score = $2, time_taken = $3, memory_used = $4
         WHERE id = $5`,
        [status, score, timeTaken, memoryUsed, submissionId],
      );

      // insert per test case results
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

      // update leaderboard in redis if accepted
      if (status === "accepted") {
        await updateLeaderboard(roomCode, participantName, score, submissionId);
      }

      const io = getIO();

      // send verdict to the specific participant
      io.to(`user:${participantName}:${roomCode}`).emit("verdict", {
        submissionId,
        status,
        score,
        timeTaken,
      });

      // broadcast leaderboard to whole room
      const leaderboard = await getLeaderboard(roomCode);
      io.to(`room:${roomCode}`).emit("leaderboard_update", { leaderboard });
    } catch (err) {
      console.error("Verdict processing error:", err);
    }
  });
};

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
