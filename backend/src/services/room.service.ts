import pool from "../config/postgres";
import redis from "../config/redis";

const generateRoomCode = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const length = 6;
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createRoom = async (
  hostUserId: string,
  name: string,
  timerDuration?: number,
) => {
  let code = generateRoomCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await pool.query("SELECT id FROM rooms WHERE code = $1", [
      code,
    ]);
    if (existing.rows.length === 0) break;
    code = generateRoomCode();
    attempts++;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      `INSERT INTO rooms (code, name, created_by, timer_duration)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [code, name, hostUserId, timerDuration ?? null],
    );
    const room = roomResult.rows[0];

    await client.query(
      `INSERT INTO room_hosts (room_id, user_id) VALUES ($1, $2)`,
      [room.id, hostUserId],
    );

    await client.query("COMMIT");

    await redis.hset(`room:${code}:timer`, {
      duration: timerDuration || 0,
      startedAt: "",
      elapsed: 0,
      status: "waiting",
    });

    return room;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const getRoomByCode = async (code: string) => {
  const result = await pool.query(
    `SELECT r.*, u.name as host_name
     FROM rooms r
     JOIN users u ON u.id = r.created_by
     WHERE r.code = $1`,
    [code],
  );
  if (!result.rows[0]) throw new Error("Room not found");
  return result.rows[0];
};

export const joinRoom = async (
  code: string,
  name: string,
  role: "host" | "participant" | "viewer",
  userId?: string,
) => {
  const room = await getRoomByCode(code);

  if (room.status === "ended") throw new Error("Contest has ended");

  if (role === "host") {
    if (!userId) throw new Error("Hosts must be authenticated");

    await pool.query(
      `INSERT INTO room_hosts (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [room.id, userId],
    );

    await redis.hset(
      `room:${code}:participants`,
      name,
      JSON.stringify({
        role,
        joinedAt: new Date().toISOString(),
        userId,
      }),
    );
  } else {
    const existing = await redis.hget(`room:${code}:participants`, name);
    if (existing) {
      const parsed = JSON.parse(existing) as { role: string };
      if (parsed.role !== role) {
        throw new Error("Name already taken in this room");
      }
    }

    await redis.hset(
      `room:${code}:participants`,
      name,
      JSON.stringify({
        role,
        joinedAt: new Date().toISOString(),
      }),
    );
  }

  const participantsRaw = await redis.hgetall(`room:${code}:participants`);
  const participants = Object.entries(participantsRaw || {}).map(([n, v]) => ({
    name: n,
    ...(JSON.parse(v as string) as { role: string; joinedAt: string }),
  }));

  return { room, participants };
};

export const getRoomParticipants = async (code: string) => {
  const raw = await redis.hgetall(`room:${code}:participants`);
  if (!raw) return [];
  return Object.entries(raw).map(([name, val]) => ({
    name,
    ...(JSON.parse(val as string) as { role: string; joinedAt: string }),
  }));
};

export const removeParticipant = async (
  code: string,
  name: string,
): Promise<void> => {
  await redis.hdel(`room:${code}:participants`, name);
};

export const getRoomHosts = async (roomId: string) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, rh.joined_at
     FROM room_hosts rh
     JOIN users u ON u.id = rh.user_id
     WHERE rh.room_id = $1`,
    [roomId],
  );
  return result.rows;
};

export const verifyRoomHost = async (
  code: string,
  userId: string,
): Promise<boolean> => {
  const room = await getRoomByCode(code);
  const result = await pool.query(
    `SELECT id FROM room_hosts WHERE room_id = $1 AND user_id = $2`,
    [room.id, userId],
  );
  return result.rows.length > 0;
};
