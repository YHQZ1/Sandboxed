import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";

import { registerRoomHandlers } from "./handlers/room.handlers";
import { registerTimerHandlers } from "./handlers/timer.handlers";
import { registerProctorHandlers } from "./handlers/proctor.handlers";

let io: SocketServer;

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    registerRoomHandlers(io, socket);
    registerTimerHandlers(io, socket);
    registerProctorHandlers(io, socket);
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
