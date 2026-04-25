export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  created_by: string;
  status: "waiting" | "active" | "paused" | "ended";
  timer_duration: number;
  timer_started_at: Date | null;
  timer_elapsed: number;
  created_at: Date;
}

export interface Problem {
  id: string;
  room_id: string;
  title: string;
  description: string;
  input_format: string;
  output_format: string;
  constraints: string;
  points: number;
  time_limit: number;
  memory_limit: number;
  order_index: number;
  created_at: Date;
}

export interface TestCase {
  id: string;
  problem_id: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
}

export interface Submission {
  id: string;
  room_id: string;
  problem_id: string;
  participant_name: string;
  language: "cpp" | "c" | "java" | "python" | "javascript";
  code: string;
  status:
    | "queued"
    | "judging"
    | "accepted"
    | "wrong_answer"
    | "tle"
    | "runtime_error"
    | "compilation_error";
  score: number;
  time_taken: number | null;
  memory_used: number | null;
  submitted_at: Date;
}

export interface SubmissionResult {
  id: string;
  submission_id: string;
  test_case_id: string;
  status: "accepted" | "wrong_answer" | "tle" | "runtime_error";
  time_taken: number | null;
  memory_used: number | null;
  actual_output: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}
