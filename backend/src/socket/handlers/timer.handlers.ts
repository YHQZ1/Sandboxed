import { Server as SocketServer, Socket } from "socket.io";
import redis from "../../config/redis";
import pool from "../../config/db";
import { verifyRoomHost } from "../../services/room.service";

const timerIntervals = new Map<string, NodeJS.Timeout>();

export const registerTimerHandlers = (io: SocketServer, socket: Socket) => {
  socket.on(
    "timer_start",
    async ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      const code = roomCode.toUpperCase();
      try {
        const isHost = await verifyRoomHost(code, userId);
        if (!isHost) {
          socket.emit("error", { message: "Only hosts can start the timer" });
          return;
        }

        const timerData = await redis.hgetall(`room:${code}:timer`);
        const duration = parseInt(timerData.duration);
        if (!duration) {
          socket.emit("error", {
            message: "No timer duration set for this room",
          });
          return;
        }

        const startedAt = Date.now();
        await redis.hset(`room:${code}:timer`, {
          startedAt: startedAt.toString(),
          elapsed: "0",
          status: "active",
        });

        await pool.query(
          `UPDATE rooms SET status = 'active', timer_started_at = NOW(), timer_elapsed = 0 WHERE code = $1`,
          [code],
        );

        if (timerIntervals.has(code)) clearInterval(timerIntervals.get(code)!);

        let timeRemaining = duration;

        const interval = setInterval(async () => {
          timeRemaining--;

          io.to(`room:${code}`).emit("timer_tick", {
            timeRemaining,
            status: "active",
          });

          if (timeRemaining <= 0) {
            clearInterval(interval);
            timerIntervals.delete(code);

            await redis.hset(`room:${code}:timer`, { status: "ended" });
            await pool.query(
              `UPDATE rooms SET status = 'ended' WHERE code = $1`,
              [code],
            );

            const leaderboardRaw = await redis.zrange(
              `room:${code}:leaderboard`,
              0,
              -1,
              "WITHSCORES",
            );
            const leaderboard: any[] = [];
            for (let i = 0; i < leaderboardRaw.length; i += 2) {
              leaderboard.push(JSON.parse(leaderboardRaw[i]));
            }

            io.to(`room:${code}`).emit("contest_ended", {
              finalLeaderboard: leaderboard,
            });
          }
        }, 1000);

        timerIntervals.set(code, interval);

        io.to(`room:${code}`).emit("timer_started", {
          duration,
          timeRemaining: duration,
        });
      } catch (err) {
        console.error("timer_start error:", err);
        socket.emit("error", { message: "Failed to start timer" });
      }
    },
  );

  socket.on(
    "timer_pause",
    async ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      const code = roomCode.toUpperCase();
      try {
        const isHost = await verifyRoomHost(code, userId);
        if (!isHost) {
          socket.emit("error", { message: "Only hosts can pause the timer" });
          return;
        }

        const timerData = await redis.hgetall(`room:${code}:timer`);
        const startedAt = parseInt(timerData.startedAt);
        const duration = parseInt(timerData.duration);
        const prevElapsed = parseInt(timerData.elapsed || "0");
        const elapsed =
          prevElapsed + Math.floor((Date.now() - startedAt) / 1000);
        const timeRemaining = duration - elapsed;

        await redis.hset(`room:${code}:timer`, {
          elapsed: elapsed.toString(),
          status: "paused",
        });
        await pool.query(
          `UPDATE rooms SET status = 'paused', timer_elapsed = $1 WHERE code = $2`,
          [elapsed, code],
        );

        if (timerIntervals.has(code)) {
          clearInterval(timerIntervals.get(code)!);
          timerIntervals.delete(code);
        }

        io.to(`room:${code}`).emit("timer_paused", { timeRemaining });
      } catch (err) {
        console.error("timer_pause error:", err);
        socket.emit("error", { message: "Failed to pause timer" });
      }
    },
  );

  socket.on(
    "timer_resume",
    async ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      const code = roomCode.toUpperCase();
      try {
        const isHost = await verifyRoomHost(code, userId);
        if (!isHost) {
          socket.emit("error", { message: "Only hosts can resume the timer" });
          return;
        }

        const timerData = await redis.hgetall(`room:${code}:timer`);
        const duration = parseInt(timerData.duration);
        const elapsed = parseInt(timerData.elapsed || "0");
        const timeRemaining = duration - elapsed;
        const startedAt = Date.now();

        await redis.hset(`room:${code}:timer`, {
          startedAt: startedAt.toString(),
          status: "active",
        });
        await pool.query(`UPDATE rooms SET status = 'active' WHERE code = $1`, [
          code,
        ]);

        if (timerIntervals.has(code)) clearInterval(timerIntervals.get(code)!);

        let remaining = timeRemaining;

        const interval = setInterval(async () => {
          remaining--;
          io.to(`room:${code}`).emit("timer_tick", {
            timeRemaining: remaining,
            status: "active",
          });

          if (remaining <= 0) {
            clearInterval(interval);
            timerIntervals.delete(code);

            await redis.hset(`room:${code}:timer`, { status: "ended" });
            await pool.query(
              `UPDATE rooms SET status = 'ended' WHERE code = $1`,
              [code],
            );

            const leaderboardRaw = await redis.zrange(
              `room:${code}:leaderboard`,
              0,
              -1,
              "WITHSCORES",
            );
            const leaderboard: any[] = [];
            for (let i = 0; i < leaderboardRaw.length; i += 2) {
              leaderboard.push(JSON.parse(leaderboardRaw[i]));
            }

            io.to(`room:${code}`).emit("contest_ended", {
              finalLeaderboard: leaderboard,
            });
          }
        }, 1000);

        timerIntervals.set(code, interval);
        io.to(`room:${code}`).emit("timer_resumed", { timeRemaining });
      } catch (err) {
        console.error("timer_resume error:", err);
        socket.emit("error", { message: "Failed to resume timer" });
      }
    },
  );
};
