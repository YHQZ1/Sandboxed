export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  created_by: string;
  status: "waiting" | "active" | "paused" | "ended";
  timer_duration: number;
  timer_started_at: string | null;
  timer_elapsed: number;
  created_at: string;
  host_name: string;
}

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
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
  created_at: string;
  test_cases: TestCase[];
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  solvedCount: number;
  lastAcceptedAt: string | null;
}

export interface Participant {
  name: string;
  role: "host" | "participant" | "viewer";
  joinedAt: string;
}

export interface TimerState {
  duration: string;
  startedAt: string;
  elapsed: string;
  status: "waiting" | "active" | "paused" | "ended";
}

export type Language = "cpp" | "c" | "java" | "python" | "javascript";

export type SubmissionStatus =
  | "queued"
  | "judging"
  | "accepted"
  | "wrong_answer"
  | "tle"
  | "runtime_error"
  | "compilation_error";

export interface Submission {
  id: string;
  problem_id: string;
  participant_name: string;
  language: Language;
  status: SubmissionStatus;
  score: number;
  time_taken: number | null;
  submitted_at: string;
}
