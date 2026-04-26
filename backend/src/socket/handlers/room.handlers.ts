import { Server as SocketServer, Socket } from "socket.io";
import redis from "../../config/redis";
import { getRoomByCode } from "../../services/room.service";
import { getProblems, getPublicProblems } from "../../services/problem.service";

export const registerRoomHandlers = (io: SocketServer, socket: Socket) => {
  socket.on(
    "join_room",
    async ({
      roomCode,
      name,
      role,
    }: {
      roomCode: string;
      name: string;
      role: "host" | "participant" | "viewer";
    }) => {
      try {
        const code = roomCode.toUpperCase();
        const room = await getRoomByCode(code);

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
        const leaderboardRaw = await redis.zrange(
          `room:${code}:leaderboard`,
          0,
          -1,
          "WITHSCORES",
        );

        const participants = Object.entries(participantsRaw || {}).map(
          ([n, v]) => ({
            name: n,
            ...JSON.parse(v as string),
          }),
        );

        const leaderboard: any[] = [];
        for (let i = 0; i < leaderboardRaw.length; i += 2) {
          const entry = JSON.parse(leaderboardRaw[i]);
          leaderboard.push(entry);
        }

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
        console.error("join_room error:", err);
        socket.emit("error", { message: "Failed to join room" });
      }
    },
  );

  socket.on("leave_room", ({ roomCode }: { roomCode: string }) => {
    const code = roomCode.toUpperCase();
    socket.leave(`room:${code}`);
    if (socket.data.name) {
      io.to(`room:${code}`).emit("participant_left", {
        name: socket.data.name,
      });
    }
  });

  socket.on("disconnecting", () => {
    const { roomCode, name } = socket.data;
    if (roomCode && name) {
      socket.to(`room:${roomCode}`).emit("participant_left", { name });
    }
  });

  socket.on(
    "problem_added",
    ({ roomCode, problem }: { roomCode: string; problem: any }) => {
      socket
        .to(`room:${roomCode.toUpperCase()}`)
        .emit("problem_added", { problem });
    },
  );

  socket.on(
    "problem_updated",
    ({ roomCode, problem }: { roomCode: string; problem: any }) => {
      socket
        .to(`room:${roomCode.toUpperCase()}`)
        .emit("problem_updated", { problem });
    },
  );

  socket.on(
    "kick_participant",
    async ({ roomCode, name }: { roomCode: string; name: string }) => {
      const code = roomCode.toUpperCase();

      io.to(`user:${name}:${code}`).emit("kicked");

      io.to(`room:${code}`).emit("participant_left", { name });
    },
  );
};
