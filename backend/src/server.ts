import app from "./app";
import http from "http";
import { initSocket } from "./socket";
import pool from "./config/postgres";
import redis from "./config/redis";

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

initSocket(server);

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    try {
      await pool.end();
      redis.disconnect();
      console.log("Connections closed");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown", err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
