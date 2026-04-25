CREATE TABLE problems (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID REFERENCES rooms(id) ON DELETE CASCADE,
  title          VARCHAR(255) NOT NULL,
  description    TEXT NOT NULL,
  input_format   TEXT,
  output_format  TEXT,
  constraints    TEXT,
  points         INTEGER DEFAULT 100,
  time_limit     INTEGER DEFAULT 2,
  memory_limit   INTEGER DEFAULT 256,
  order_index    INTEGER DEFAULT 0,
  created_at     TIMESTAMP DEFAULT NOW()
);
