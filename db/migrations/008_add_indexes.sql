-- Index for room code (used in every room lookup)
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);

-- Submissions: filtering by room, participant, problem, status
CREATE INDEX IF NOT EXISTS idx_submissions_room_id ON submissions(room_id);
CREATE INDEX IF NOT EXISTS idx_submissions_participant ON submissions(room_id, participant_name);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- Submission results: looking up by submission or test case
CREATE INDEX IF NOT EXISTS idx_submission_results_submission ON submission_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_results_test_case ON submission_results(test_case_id);

-- Problems per room
CREATE INDEX IF NOT EXISTS idx_problems_room ON problems(room_id);

-- Test cases per problem
CREATE INDEX IF NOT EXISTS idx_test_cases_problem ON test_cases(problem_id);

-- Room hosts: fast verification of host status
CREATE INDEX IF NOT EXISTS idx_room_hosts_room_user ON room_hosts(room_id, user_id);