-- Add ON DELETE CASCADE to submissions -> rooms
ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_room_id_fkey,
  ADD CONSTRAINT submissions_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;