/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function CreateRoom() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"login" | "create">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [duration, setDuration] = useState(90);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("hostName", res.data.user.name);
      setName(res.data.user.name);
      setStep("create");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/rooms", {
        name: roomName,
        timerDuration: duration * 60,
      });
      const code = res.data.room.code;
      navigate(`/room/${code}`, {
        state: { name, role: "host" },
      });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="w-full max-w-md bg-zinc-900 rounded-xl p-8 border border-zinc-800">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate("/")}
            className="text-zinc-500 hover:text-white transition text-sm"
          >
            Back
          </button>
        </div>
        <h1 className="text-2xl font-bold mb-6">
          {step === "login" ? "Host Login" : "Create Contest Room"}
        </h1>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {step === "login" ? (
          <div className="flex flex-col gap-4">
            <input
              className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <input
              className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              onClick={handleLogin}
              disabled={loading}
              className="bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Continue"}
            </button>
            <p className="text-zinc-500 text-sm text-center">
              No account?{" "}
              <span
                onClick={() => navigate("/register")}
                className="text-white underline cursor-pointer"
              >
                Register
              </span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-zinc-800 rounded-lg px-4 py-3 text-zinc-400 text-sm">
              Hosting as <span className="text-white font-medium">{name}</span>
            </div>
            <input
              className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Contest name (e.g. Round 1 - Backend)"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div>
              <label className="text-zinc-400 text-sm mb-1 block">
                Duration (minutes)
              </label>
              <input
                className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 w-full"
                type="number"
                min={10}
                max={300}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={loading || !roomName}
              className="bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Room"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
