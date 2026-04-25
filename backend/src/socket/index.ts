import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { registerRoomHandlers } from "./handlers/room.handlers";
import { registerTimerHandlers } from "./handlers/timer.handlers";
import redis from "../config/redis";

let io: SocketServer;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    registerRoomHandlers(io, socket);
    registerTimerHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  // listen for verdict events published by the judge service
  const verdictSub = redis.duplicate();
  verdictSub.subscribe("pubsub:verdict", (err) => {
    if (err) console.error("Failed to subscribe to verdicts:", err);
  });

  verdictSub.on("message", (_channel, message) => {
    try {
      const verdict = JSON.parse(message);
      // emit to the specific participant's socket room
      io.to(`user:${verdict.participantName}:${verdict.roomCode}`).emit(
        "verdict",
        verdict,
      );
      // broadcast leaderboard update to the whole room
      io.to(`room:${verdict.roomCode}`).emit("leaderboard_update", {
        leaderboard: verdict.leaderboard,
      });
    } catch (err) {
      console.error("Verdict parse error:", err);
    }
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
