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
      setError("Room code and name are required.");
      return;
    }
    if (role === "host" && (!email || !password)) {
      setError("Hosts must provide email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (role === "host") {
        const loginRes = await api.post("/auth/login", { email, password });
        const token = loginRes.data.token;

        localStorage.setItem("token", token);
        localStorage.setItem("userId", loginRes.data.user.id);
        localStorage.setItem("hostName", loginRes.data.user.name);

        await api.post(`/rooms/${code.toLowerCase()}/join`, { name, role });

        sessionStorage.setItem(
          `room:${code.toLowerCase()}`,
          JSON.stringify({ name, role }),
        );
        navigate(`/room/${code.toLowerCase()}`, { state: { name, role } });
      } else {
        await api.post(`/rooms/${code.toLowerCase()}/join`, { name, role });

        sessionStorage.setItem(
          `room:${code.toLowerCase()}`,
          JSON.stringify({ name, role }),
        );
        navigate(`/room/${code.toLowerCase()}`, { state: { name, role } });
      }
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "error" in err.response.data
      ) {
        setError(String(err.response.data.error));
      } else {
        setError("Failed to join room.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans flex flex-col justify-center items-center px-6 selection:bg-[#262626] selection:text-[#ededed]">
      <div className="max-w-sm w-full flex flex-col">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-[#737373] hover:text-[#ededed] transition-colors mb-12 self-start"
        >
          Back to home
        </button>

        <h1 className="text-3xl font-medium tracking-tight text-[#f5f5f5] mb-2">
          Join a room
        </h1>
        <p className="text-[#a3a3a3] text-sm leading-relaxed mb-8">
          Enter your room code and choose how you want to participate.
        </p>

        {error && (
          <div className="bg-[#171717] border border-[#262626] px-4 py-3 rounded mb-6">
            <p className="text-sm text-[#ededed]">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-5 mb-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#737373]">Room code</label>
            <input
              placeholder="e.g. abc123"
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="w-full bg-transparent border border-[#262626] rounded px-3 py-2.5 text-[#ededed] placeholder-[#404040] outline-none focus:border-[#737373] transition-colors text-sm lowercase"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#737373]">Your name</label>
            <input
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="w-full bg-transparent border border-[#262626] rounded px-3 py-2.5 text-[#ededed] placeholder-[#404040] outline-none focus:border-[#737373] transition-colors text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#737373]">Join as</label>
            <div className="flex border border-[#262626] rounded overflow-hidden">
              {(["participant", "viewer", "host"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                    role === r
                      ? "bg-[#ededed] text-[#0a0a0a]"
                      : "bg-transparent text-[#737373] hover:text-[#ededed]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {role === "host" && (
            <div className="flex flex-col gap-5 pt-5 mt-2 border-t border-[#262626]">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-[#737373]">Host email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  className="w-full bg-transparent border border-[#262626] rounded px-3 py-2.5 text-[#ededed] placeholder-[#404040] outline-none focus:border-[#737373] transition-colors text-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-[#737373]">Host password</label>
                <input
                  type="password"
                  placeholder="········"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  className="w-full bg-transparent border border-[#262626] rounded px-3 py-2.5 text-[#ededed] placeholder-[#404040] outline-none focus:border-[#737373] transition-colors text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full px-8 py-3.5 text-sm font-medium bg-[#ededed] text-[#0a0a0a] rounded hover:bg-[#d4d4d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Joining room..." : "Join Room"}
        </button>
      </div>
    </div>
  );
}
