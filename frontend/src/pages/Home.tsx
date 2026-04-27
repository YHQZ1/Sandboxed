import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans flex flex-col justify-center items-center px-6 selection:bg-[#262626] selection:text-[#ededed]">
      <div className="max-w-xl w-full flex flex-col items-center text-center">
        <h1 className="text-7xl md:text-9xl font-medium tracking-tighter mb-6 text-[#f5f5f5]">
          Sandboxed.
        </h1>

        <p className="text-[#a3a3a3] text-lg mb-12 max-w-md leading-relaxed">
          Host live coding contests. Share a room code. Watch candidates compete
          in real-time.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-16">
          <button
            onClick={() => navigate("/create")}
            className="px-8 py-3.5 text-sm font-medium bg-[#ededed] text-[#0a0a0a] rounded hover:bg-[#d4d4d4] transition-colors w-full sm:w-auto"
          >
            Host Contest
          </button>
          <button
            onClick={() => navigate("/join")}
            className="px-8 py-3.5 text-sm font-medium bg-transparent text-[#ededed] border border-[#262626] rounded hover:bg-[#171717] transition-colors w-full sm:w-auto"
          >
            Join Room
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 text-sm text-[#737373]">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            <span>Real-time execution</span>
            <span>/</span>
            <span>Sandboxed environments</span>
            <span>/</span>
            <span>Live leaderboard</span>
          </div>
          <div className="text-[#a3a3a3]">
            C · C++ · Java · Python · JavaScript
          </div>
        </div>
      </div>
    </div>
  );
}
