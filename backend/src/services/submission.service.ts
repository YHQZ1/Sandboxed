import pool from "../config/postgres";
import redis from "../config/redis";
import axios from "axios";
import { getProblemById } from "./problem.service";
import { getRoomByCode } from "./room.service";

const JUDGE_URL = process.env.JUDGE_URL || "http://localhost:5001";

export const submitCode = async (
  roomCode: string,
  problemId: string,
  participantName: string,
  language: string,
  code: string,
) => {
  const room = await getRoomByCode(roomCode);

  if (room.status !== "active") {
    throw new Error("Contest is not active");
  }

  const participant = await redis.hget(
    `room:${roomCode}:participants`,
    participantName,
  );
  if (!participant) {
    throw new Error("Participant not found in room");
  }

  const parsed = JSON.parse(participant) as { role: string };
  if (parsed.role !== "participant") {
    throw new Error("Only participants can submit");
  }

  const problem = await getProblemById(problemId);

  const alreadySolved = await pool.query(
    `SELECT id FROM submissions 
     WHERE room_id = $1 AND problem_id = $2 AND participant_name = $3 AND status = 'accepted'`,
    [room.id, problemId, participantName],
  );
  if (alreadySolved.rows.length > 0) {
    throw new Error("Already solved");
  }

  const result = await pool.query(
    `INSERT INTO submissions (room_id, problem_id, participant_name, language, code, status)
     VALUES ($1, $2, $3, $4, $5, 'queued')
     RETURNING *`,
    [room.id, problemId, participantName, language, code],
  );
  const submission = result.rows[0];

  const tcResult = await pool.query(
    `SELECT id, input, expected_output FROM test_cases 
     WHERE problem_id = $1 ORDER BY order_index`,
    [problemId],
  );

  try {
    await axios.post(
      `${JUDGE_URL}/submit`,
      {
        submissionId: submission.id,
        roomCode,
        problemId,
        participantName,
        language,
        code,
        timeLimit: problem.time_limit,
        memoryLimit: problem.memory_limit,
        testCases: tcResult.rows,
      },
      { timeout: 5000 },
    );
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.code === "ECONNREFUSED") {
      throw new Error("Judge service unavailable");
    }
    throw new Error("Failed to send submission to judge");
  }

  return submission;
};

export const getSubmission = async (submissionId: string) => {
  const result = await pool.query(
    `SELECT s.*, 
       json_agg(
         json_build_object(
           'id', sr.id,
           'test_case_id', sr.test_case_id,
           'status', sr.status,
           'time_taken', sr.time_taken,
           'memory_used', sr.memory_used,
           'actual_output', sr.actual_output
         )
       ) FILTER (WHERE sr.id IS NOT NULL) as results
     FROM submissions s
     LEFT JOIN submission_results sr ON sr.submission_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [submissionId],
  );
  if (!result.rows[0]) throw new Error("Submission not found");
  return result.rows[0];
};

export const getRoomSubmissions = async (roomId: string) => {
  const result = await pool.query(
    `SELECT * FROM submissions WHERE room_id = $1 ORDER BY submitted_at DESC`,
    [roomId],
  );
  return result.rows;
};

export const getParticipantSubmissions = async (
  roomId: string,
  participantName: string,
) => {
  const result = await pool.query(
    `SELECT s.*,
       json_agg(
         json_build_object(
           'id', sr.id,
           'test_case_id', sr.test_case_id,
           'status', sr.status,
           'time_taken', sr.time_taken,
           'memory_used', sr.memory_used,
           'actual_output', sr.actual_output
         )
       ) FILTER (WHERE sr.id IS NOT NULL) as results
     FROM submissions s
     LEFT JOIN submission_results sr ON sr.submission_id = s.id
     WHERE s.room_id = $1 AND s.participant_name = $2
     GROUP BY s.id
     ORDER BY s.submitted_at DESC`,
    [roomId, participantName],
  );
  return result.rows;
};
