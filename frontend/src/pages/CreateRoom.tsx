/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function CreateRoom() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [duration, setDuration] = useState(90);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hostName, setHostName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedName = localStorage.getItem("hostName");
    if (!token) {
      navigate("/login");
    } else {
      setHostName(storedName || "Host");
    }
  }, [navigate]);

  const handleCreate = async () => {
    if (!roomName) {
      setError("Contest name is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/rooms", {
        name: roomName,
        timerDuration: duration * 60,
      });
      const code = res.data.room.code;
      sessionStorage.setItem(
        `room:${code}`,
        JSON.stringify({ name: hostName, role: "host" }),
      );
      navigate(`/room/${code}`, { state: { name: hostName, role: "host" } });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create room.");
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
          Room details
        </h1>
        <p className="text-[#a3a3a3] text-sm leading-relaxed mb-8">
          Configure the parameters for your live coding session.
        </p>

        {error && (
          <div className="bg-[#171717] border border-[#262626] px-4 py-3 rounded mb-6">
            <p className="text-sm text-[#ededed]">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-5 mb-8">
          <div className="text-sm text-[#737373] pb-4 border-b border-[#262626] mb-2">
            Authenticated as{" "}
            <span className="text-[#ededed] font-medium">{hostName}</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#737373]">Contest Name</label>
            <input
              type="text"
              placeholder="e.g. Round 1 — Backend"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full bg-transparent border border-[#262626] rounded px-3 py-2.5 text-[#ededed] placeholder-[#404040] outline-none focus:border-[#737373] transition-colors text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#737373]">Duration (minutes)</label>
            <input
              type="number"
              min={10}
              max={300}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full bg-transparent border border-[#262626] rounded px-3 py-2.5 text-[#ededed] outline-none focus:border-[#737373] transition-colors text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !roomName}
          className="w-full px-8 py-3.5 text-sm font-medium bg-[#ededed] text-[#0a0a0a] rounded hover:bg-[#d4d4d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating environment..." : "Create Room"}
        </button>
      </div>
    </div>
  );
}
