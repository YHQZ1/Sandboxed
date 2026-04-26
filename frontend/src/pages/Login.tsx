/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("hostName", res.data.user.name);
      navigate("/create");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans flex flex-col justify-center items-center px-6 selection:bg-[#262626] selection:text-[#ededed]">
      <div className="max-w-sm w-full flex flex-col">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-[#737373] hover:text-[#ededed] transition-colors mb-12 self-start flex items-center gap-2"
        >
          ← Back to home
        </button>

        <h1 className="text-3xl font-medium tracking-tight text-[#f5f5f5] mb-2">
          Host login
        </h1>
        <p className="text-[#a3a3a3] text-sm leading-relaxed mb-8">
          Authenticate to spin up a new contest environment.
        </p>

        {error && (
          <div className="bg-[#171717] border border-[#262626] px-4 py-3 rounded mb-6">
            <p className="text-sm text-[#ededed]">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-5 mb-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#737373]">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-transparent border border-[#262626] rounded px-3 py-2.5 text-[#ededed] placeholder-[#404040] outline-none focus:border-[#737373] transition-colors text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#737373]">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-transparent border border-[#262626] rounded px-3 py-2.5 text-[#ededed] placeholder-[#404040] outline-none focus:border-[#737373] transition-colors text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full px-8 py-3.5 text-sm font-medium bg-[#ededed] text-[#0a0a0a] rounded hover:bg-[#d4d4d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          {loading ? "Authenticating..." : "Continue"}
        </button>

        <div className="text-center">
          <p className="text-sm text-[#737373]">
            No account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-[#ededed] hover:text-[#a3a3a3] transition-colors underline underline-offset-4"
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
