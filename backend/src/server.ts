import app from "./app";
import http from "http";
import dotenv from "dotenv";
import { initSocket } from "./socket";

dotenv.config();

const server = http.createServer(app);

initSocket(server);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Dojo server running on port ${PORT}`);
});

export { server };
