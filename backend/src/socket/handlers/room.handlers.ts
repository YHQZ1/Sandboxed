import { Server as SocketServer, Socket } from "socket.io";
import redis from "../../config/redis";
import { getRoomByCode } from "../../services/room.service";
import { getProblems, getPublicProblems } from "../../services/problem.service";
import { Problem } from "../../types";

interface LeaderboardEntry {
  name: string;
  score: number;
  solvedCount: number;
  lastAcceptedAt: string | null;
}

export const registerRoomHandlers = (io: SocketServer, socket: Socket) => {
  socket.on(
    "join_room",
    async ({
      roomCode,
      name,
      role,
      deviceId,
    }: {
      roomCode: string;
      name: string;
      role: "host" | "participant" | "viewer";
      deviceId?: string;
    }) => {
      try {
        const code = roomCode;
        const room = await getRoomByCode(code);

        if (room.status === "ended" && role !== "host") {
          const metaKey = `room:${code}:leaderboard:meta`;
          const leaderboardNames = await redis.zrevrange(
            `room:${code}:leaderboard`,
            0,
            -1,
          );
          const finalLeaderboard: LeaderboardEntry[] = await Promise.all(
            leaderboardNames.map(async (n) => {
              const meta = await redis.hget(metaKey, n);
              return meta
                ? (JSON.parse(meta) as LeaderboardEntry)
                : { name: n, score: 0, solvedCount: 0, lastAcceptedAt: null };
            }),
          );
          socket.emit("contest_ended", { finalLeaderboard });
          return;
        }

        if (deviceId && role === "participant") {
          const banned = await redis.sismember(
            `room:${code}:banned_devices`,
            deviceId,
          );
          if (banned) {
            socket.emit("banned", {
              message: "You have been banned from this room.",
            });
            return;
          }
          await redis.hset(`room:${code}:device_ids`, name, deviceId);
        }

        socket.join(`room:${code}`);
        if (role === "participant") {
          socket.join(`user:${name}:${code}`);
        }

        socket.data.roomCode = code;
        socket.data.name = name;
        socket.data.role = role;

        const timerRaw = await redis.hgetall(`room:${code}:timer`);
        const participantsRaw = await redis.hgetall(
          `room:${code}:participants`,
        );

        const participants = Object.entries(participantsRaw || {}).map(
          ([n, v]) => ({
            name: n,
            ...(JSON.parse(v as string) as { role: string; joinedAt: string }),
          }),
        );

        const metaKey = `room:${code}:leaderboard:meta`;
        const leaderboardNames = await redis.zrevrange(
          `room:${code}:leaderboard`,
          0,
          -1,
        );
        const leaderboard: LeaderboardEntry[] = await Promise.all(
          leaderboardNames.map(async (n) => {
            const meta = await redis.hget(metaKey, n);
            return meta
              ? (JSON.parse(meta) as LeaderboardEntry)
              : { name: n, score: 0, solvedCount: 0, lastAcceptedAt: null };
          }),
        );

        const problems =
          role === "host"
            ? await getProblems(room.id)
            : await getPublicProblems(room.id);

        socket.emit("room_joined", {
          room,
          participants,
          problems,
          leaderboard,
          timer: timerRaw,
        });

        socket.to(`room:${code}`).emit("participant_joined", { name, role });
      } catch (err) {
        socket.emit("error", { message: "Failed to join room" });
      }
    },
  );

  socket.on("leave_room", ({ roomCode }: { roomCode: string }) => {
    const code = roomCode;
    socket.leave(`room:${code}`);
    if (socket.data.name) {
      io.to(`room:${code}`).emit("participant_left", {
        name: socket.data.name,
      });
    }
  });

  socket.on("disconnecting", () => {
    const { roomCode, name, role } = socket.data;
    if (roomCode && name && role !== "host") {
      socket.to(`room:${roomCode}`).emit("participant_left", { name });
    }
  });

  socket.on(
    "problem_added",
    ({ roomCode, problem }: { roomCode: string; problem: Problem }) => {
      socket.to(`room:${roomCode}`).emit("problem_added", { problem });
    },
  );

  socket.on(
    "problem_updated",
    ({ roomCode, problem }: { roomCode: string; problem: Problem }) => {
      socket.to(`room:${roomCode}`).emit("problem_updated", { problem });
    },
  );

  socket.on(
    "kick_participant",
    async ({ roomCode, name }: { roomCode: string; name: string }) => {
      const code = roomCode;
      if (socket.data.role !== "host" || socket.data.roomCode !== code) {
        socket.emit("error", { message: "Only hosts can kick participants" });
        return;
      }
      io.to(`user:${name}:${code}`).emit("kicked");
      io.to(`room:${code}`).emit("participant_left", { name });
    },
  );
};
