import pool from "../config/db";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";

const generateToken = (userId: string, email: string): string => {
  const payload = { userId, email };
  const secret = process.env.JWT_SECRET as string;
  const options: SignOptions = { expiresIn: "7d" };
  return jwt.sign(payload, secret, options);
};

export const registerUser = async (
  name: string,
  email: string,
  password: string,
) => {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.rows.length > 0) throw new Error("Email already registered");

  const password_hash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
    [name, email, password_hash],
  );

  const user = result.rows[0];
  const token = generateToken(user.id, user.email);

  return { user, token };
};

export const loginUser = async (email: string, password: string) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  const user = result.rows[0];

  if (!user) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error("Invalid credentials");

  const token = generateToken(user.id, user.email);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    token,
  };
};

export const getUserById = async (userId: string) => {
  const result = await pool.query(
    "SELECT id, name, email, created_at FROM users WHERE id = $1",
    [userId],
  );
  if (!result.rows[0]) throw new Error("User not found");
  return result.rows[0];
};
