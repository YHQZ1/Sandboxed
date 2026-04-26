import { Server as SocketServer, Socket } from "socket.io";
import redis from "../../config/redis";
import { removeParticipant } from "../../services/room.service";

const MAX_VIOLATIONS = 3;

export const registerProctorHandlers = (_io: SocketServer, socket: Socket) => {
  socket.on(
    "proctor_violation",
    async ({
      roomCode,
      type,
      participant,
    }: {
      roomCode: string;
      type: string;
      participant: string;
    }) => {
      if (!roomCode || !participant) return;

      const code = roomCode;
      const violationKey = `room:${code}:violations:${participant}`;

      try {
        const multi = redis.multi();
        multi.incr(violationKey);
        multi.expire(violationKey, 3600);
        const results = await multi.exec();
        if (!results) return;

        const count = results[0][1] as number;

        if (count >= MAX_VIOLATIONS) {
          // get device ID for this participant before removing
          const deviceId = await redis.hget(
            `room:${code}:device_ids`,
            participant,
          );

          // ban the device so they can't rejoin
          if (deviceId) {
            await redis.sadd(`room:${code}:banned_devices`, deviceId);
          }

          await removeParticipant(code, participant);

          _io.to(`user:${participant}:${code}`).emit("kicked", {
            reason: "Proctoring violations exceeded",
          });

          _io.to(`room:${code}`).emit("participant_left", {
            name: participant,
          });

          await redis.del(violationKey);
        } else {
          socket.emit("violation_warning", { count, max: MAX_VIOLATIONS });
        }
      } catch (err) {
        // ignore violations if Redis is down
      }
    },
  );
};
