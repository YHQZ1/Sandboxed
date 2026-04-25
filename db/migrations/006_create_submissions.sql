CREATE TABLE submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          UUID REFERENCES rooms(id),
  problem_id       UUID REFERENCES problems(id),
  participant_name VARCHAR(100) NOT NULL,
  language         VARCHAR(20) NOT NULL,
  code             TEXT NOT NULL,
  status           VARCHAR(30) DEFAULT 'queued',
  score            INTEGER DEFAULT 0,
  time_taken       INTEGER,
  memory_used      INTEGER,
  submitted_at     TIMESTAMP DEFAULT NOW()
);
