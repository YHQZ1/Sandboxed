/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

type Role = "host" | "participant" | "viewer";

export default function JoinRoom() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("participant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code || !name) {
      setError("Room code and name are required");
      return;
    }

    if (role === "host" && (!email || !password)) {
      setError("Hosts must provide email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (role === "host") {
        const loginRes = await api.post("/auth/login", { email, password });
        localStorage.setItem("token", loginRes.data.token);
        localStorage.setItem("userId", loginRes.data.user.id);
        localStorage.setItem("hostName", loginRes.data.user.name);
      }

      await api.post(`/rooms/${code.toUpperCase()}/join`, { name, role });
      navigate(`/room/${code.toUpperCase()}`, { state: { name, role } });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="w-full max-w-md bg-zinc-900 rounded-xl p-8 border border-zinc-800">
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="text-zinc-500 hover:text-white transition text-sm"
          >
            Back
          </button>
        </div>
        <h1 className="text-2xl font-bold mb-6">Join a Room</h1>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <div className="flex flex-col gap-4">
          <input
            className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 uppercase tracking-widest font-mono"
            placeholder="ROOM CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <input
            className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="text-zinc-400 text-sm mb-2 block">Join as</label>
            <div className="flex gap-3">
              {(["participant", "viewer", "host"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-lg border font-medium capitalize transition text-sm ${
                    role === r
                      ? "bg-white text-black border-white"
                      : "border-zinc-600 text-zinc-400 hover:border-zinc-400"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {role === "host" && (
            <div className="flex flex-col gap-3 border border-zinc-700 rounded-xl p-4">
              <p className="text-zinc-400 text-xs">Hosts must authenticate</p>
              <input
                className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 text-sm"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="bg-zinc-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-white/20 text-sm"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={loading}
            className="bg-white text-black font-semibold py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
        </div>
      </div>
    </div>
  );
}
