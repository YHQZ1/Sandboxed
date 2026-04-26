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
): Promise<void> => {
  const solvedKey = `room:${roomCode}:solved`;
  const alreadySolved = await redis.sismember(solvedKey, submissionId);
  if (alreadySolved) {
    return;
  }

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
    .sadd(solvedKey, submissionId)
    .zadd(
      `room:${roomCode}:leaderboard`,
      meta.score * 1e10 - Math.floor(Date.now() / 1000),
      JSON.stringify(meta),
    )
    .exec();
};

export const getLeaderboard = async (
  roomCode: string,
): Promise<LeaderboardEntry[]> => {
  const raw = await redis.zrevrange(`room:${roomCode}:leaderboard`, 0, -1);
  return raw.map((entry) => JSON.parse(entry) as LeaderboardEntry);
};
