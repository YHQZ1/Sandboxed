CREATE TABLE rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(20) UNIQUE NOT NULL,
  name             VARCHAR(255) NOT NULL,
  created_by       UUID REFERENCES users(id),
  status           VARCHAR(20) DEFAULT 'waiting',
  timer_duration   INTEGER,
  timer_started_at TIMESTAMP,
  timer_elapsed    INTEGER DEFAULT 0,
  created_at       TIMESTAMP DEFAULT NOW()
);