import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useTimerStore } from "../store/timerStore";
import Leaderboard from "../components/leaderboard/Leaderboard";
import ParticipantList from "../components/room/ParticipantList";
import ProblemList from "../components/problems/ProblemList";
import ProblemView from "../components/problems/ProblemView";
import Timer from "../components/timer/Timer";

interface Props {
  code: string;
}

type Tab = "leaderboard" | "problems" | "people";

const TIMER_STATUS: Record<string, { label: string; color: string }> = {
  waiting: { label: "Waiting", color: "text-[#737373]" },
  active: { label: "Live", color: "text-[#8BA888]" },
  paused: { label: "Paused", color: "text-[#737373]" },
  ended: { label: "Ended", color: "text-[#ef4444]" },
};

const ICONS = {
  leaderboard: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        strokeWidth={2}
      />
    </svg>
  ),
  problems: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path d="M4 6h16M4 12h16M4 18h7" strokeWidth={2} />
    </svg>
  ),
  people: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        strokeWidth={2}
      />
    </svg>
  ),
};

export default function ViewerRoom({ code }: Props) {
  const navigate = useNavigate();
  const { room, problems } = useRoomStore();
  const { status: timerStatus } = useTimerStore();
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");
  const [kickedOut, setKickedOut] = useState(false);

  useEffect(() => {
    const handleKicked = () => setKickedOut(true);
    window.addEventListener("sandboxed:kicked", handleKicked);
    return () => window.removeEventListener("sandboxed:kicked", handleKicked);
  }, []);

  const selectedProblem =
    problems.find((p) => p.id === selectedProblemId) || null;
  const statusInfo = TIMER_STATUS[timerStatus] || TIMER_STATUS.waiting;

  return (
    <div className="h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col overflow-hidden selection:bg-[#262626]">
      <header className="h-14 border-b border-[#262626] flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-lg font-medium tracking-tight text-[#f5f5f5]">
            Sandboxed.
          </span>
          <div className="h-4 w-px bg-[#262626] hidden sm:block" />
          <span className="text-xs font-medium text-[#737373] truncate max-w-[160px] sm:max-w-[240px]">
            {room?.name} / {code}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#171717] border border-[#262626] text-[#737373] px-2 py-0.5 rounded-sm hidden sm:inline">
            Observer
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Timer />
          <div className="flex items-center gap-2 pl-4 sm:pl-6 border-l border-[#262626]">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                timerStatus === "active"
                  ? "animate-pulse bg-[#8BA888]"
                  : "bg-[#404040]"
              }`}
            />
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-14 border-r border-[#262626] flex flex-col items-center py-6 gap-8 flex-shrink-0">
          {Object.entries(ICONS).map(([key, icon]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as Tab)}
              className={`p-2 transition-colors ${
                activeTab === key
                  ? "text-[#ededed]"
                  : "text-[#404040] hover:text-[#737373]"
              }`}
            >
              {icon}
            </button>
          ))}
          <button
            onClick={() => navigate("/")}
            className="mt-auto mb-4 p-2 text-[#404040] hover:text-[#ededed] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                strokeWidth={2}
              />
            </svg>
          </button>
        </aside>

        <div className="w-64 lg:w-72 border-r border-[#262626] flex flex-col p-6 gap-6 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#404040]">
            {activeTab}
          </span>
          <div className="flex-1 overflow-y-auto">
            {activeTab === "leaderboard" && <Leaderboard />}
            {activeTab === "problems" && (
              <ProblemList
                problems={problems}
                selectedId={selectedProblemId}
                onSelect={setSelectedProblemId}
              />
            )}
            {activeTab === "people" && <ParticipantList />}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-3xl mx-auto w-full">
            {selectedProblem ? (
              <ProblemView problem={selectedProblem} />
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-sm font-medium text-[#404040]">
                  Observer Mode
                </span>
                <p className="text-xs text-[#404040] max-w-xs leading-relaxed">
                  Select a problem from the sidebar to view its details and test
                  cases.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {kickedOut && (
        <div className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#262626] p-8 max-w-sm w-full text-center space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#ef4444] uppercase tracking-[0.3em]">
                Removed
              </span>
              <h2 className="text-xl font-medium text-[#f5f5f5]">
                Access Revoked
              </h2>
              <p className="text-xs text-[#404040] leading-relaxed">
                The host has removed you from this session.
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 text-sm font-medium bg-[#ededed] text-[#0a0a0a] rounded-sm hover:bg-white transition-colors"
            >
              Exit to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
