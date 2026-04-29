import redis from "../config/redis";

interface LeaderboardEntry {
  name: string;
  score: number;
  solvedCount: number;
  lastAcceptedAt: string | null;
}

export const updateLeaderboard = async (
  roomCode: string,
  participantName: string,
  newScore: number,
  submissionId: string,
  problemId: string,
): Promise<void> => {
  const solvedKey = `room:${roomCode}:solved`;
  const solvedMember = `${participantName}:${problemId}`;
  const alreadySolved = await redis.sismember(solvedKey, solvedMember);
  if (alreadySolved) return;

  const metaKey = `room:${roomCode}:leaderboard:meta`;
  const existing = await redis.hget(metaKey, participantName);

  const meta: LeaderboardEntry = existing
    ? (JSON.parse(existing) as LeaderboardEntry)
    : { name: participantName, score: 0, solvedCount: 0, lastAcceptedAt: null };

  meta.score += newScore;
  meta.solvedCount += 1;
  meta.lastAcceptedAt = new Date().toISOString();

  await redis
    .multi()
    .hset(metaKey, participantName, JSON.stringify(meta))
    .sadd(solvedKey, solvedMember)
    .zadd(
      `room:${roomCode}:leaderboard`,
      meta.score * 1e10 - Math.floor(Date.now() / 1000),
      participantName,
    )
    .exec();
};

export const getLeaderboard = async (
  roomCode: string,
): Promise<LeaderboardEntry[]> => {
  const metaKey = `room:${roomCode}:leaderboard:meta`;
  const raw = await redis.zrevrange(`room:${roomCode}:leaderboard`, 0, -1);
  const entries = await Promise.all(
    raw.map(async (name) => {
      const meta = await redis.hget(metaKey, name);
      return meta
        ? (JSON.parse(meta) as LeaderboardEntry)
        : { name, score: 0, solvedCount: 0, lastAcceptedAt: null };
    }),
  );
  return entries;
};

export const getLeaderboardFromRedis = async (roomCode: string) => {
  const metaKey = `room:${roomCode}:leaderboard:meta`;
  const raw = await redis.zrevrange(`room:${roomCode}:leaderboard`, 0, -1);
  const entries = await Promise.all(
    raw.map(async (name) => {
      const meta = await redis.hget(metaKey, name);
      return meta
        ? JSON.parse(meta)
        : { name, score: 0, solvedCount: 0, lastAcceptedAt: null };
    }),
  );
  return entries;
};
