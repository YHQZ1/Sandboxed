import redis from "../config/redis";

export const updateLeaderboard = async (
  roomCode: string,
  participantName: string,
  newScore: number,
  submissionId: string,
) => {
  const existing = await redis.hget(
    `room:${roomCode}:leaderboard:meta`,
    participantName,
  );
  const meta = existing
    ? JSON.parse(existing)
    : { score: 0, lastAcceptedAt: null, solvedCount: 0 };

  meta.score += newScore;
  meta.solvedCount += 1;
  meta.lastAcceptedAt = new Date().toISOString();
  meta.name = participantName;

  await redis.hset(
    `room:${roomCode}:leaderboard:meta`,
    participantName,
    JSON.stringify(meta),
  );

  const sortScore = meta.score * 1e10 - Math.floor(Date.now() / 1000);

  await redis.zadd(
    `room:${roomCode}:leaderboard`,
    sortScore,
    JSON.stringify(meta),
  );
};

export const getLeaderboard = async (roomCode: string) => {
  const raw = await redis.zrevrange(`room:${roomCode}:leaderboard`, 0, -1);
  return raw.map((entry) => JSON.parse(entry));
};
