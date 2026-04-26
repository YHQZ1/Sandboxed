import { Queue } from "bullmq";
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

const submissionQueue = new Queue<SubmissionJob>("submissions", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const enqueueSubmission = async (job: SubmissionJob): Promise<void> => {
  await submissionQueue.add("judge", job, {
    jobId: job.submissionId,
  });
};

export default submissionQueue;
