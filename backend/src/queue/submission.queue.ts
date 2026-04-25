import redis from "../config/redis";

export interface SubmissionJob {
  submissionId: string;
  roomCode: string;
  problemId: string;
  participantName: string;
  language: string;
  code: string;
  timeLimit: number;
  memoryLimit: number;
  testCases: Array<{
    id: string;
    input: string;
    expected_output: string;
  }>;
}

export const enqueueSubmission = async (job: SubmissionJob) => {
  await redis.lpush("queue:submissions", JSON.stringify(job));
};
