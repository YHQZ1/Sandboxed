import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("connect", () => {
  console.log("[postgres] Connected");
});

pool.on("error", (err) => {
  console.error("[postgres] Error:", err.message);
});

export default pool;
