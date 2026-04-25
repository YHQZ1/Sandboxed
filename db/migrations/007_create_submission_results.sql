CREATE TABLE submission_results (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_id   UUID REFERENCES test_cases(id),
  status         VARCHAR(30) NOT NULL,
  time_taken     INTEGER,
  memory_used    INTEGER,
  actual_output  TEXT
);
