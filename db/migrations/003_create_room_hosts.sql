CREATE TABLE room_hosts (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);