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

const TIMER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  waiting: { label: "WAITING", color: "text-[#404040]" },
  active: { label: "LIVE", color: "text-[#8BA888]" },
  paused: { label: "PAUSED", color: "text-[#737373]" },
  ended: { label: "ENDED", color: "text-[#ef4444]" },
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
    window.addEventListener("dojo:kicked", handleKicked);
    return () => window.removeEventListener("dojo:kicked", handleKicked);
  }, []);

  const selectedProblem =
    problems.find((p) => p.id === selectedProblemId) || null;
  const statusInfo =
    TIMER_STATUS_LABEL[timerStatus] || TIMER_STATUS_LABEL.waiting;

  return (
    <div className="h-screen bg-[#050505] text-[#ededed] flex flex-col overflow-hidden selection:bg-[#262626]">
      <header className="h-14 border-b border-[#141414] flex items-center justify-between px-8 bg-[#050505] flex-shrink-0 z-10">
        <div className="flex items-center gap-6">
          <span className="text-lg font-medium tracking-tighter text-[#f5f5f5]">
            Dojo.
          </span>
          <div className="h-4 w-px bg-[#1a1a1a]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#404040] truncate max-w-[200px]">
            {room?.name} / {code}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] bg-[#111] border border-[#1a1a1a] text-[#737373] px-2 py-0.5 rounded-sm">
            Observer
          </span>
        </div>

        <div className="flex items-center gap-8">
          <Timer />
          <div className="flex items-center gap-3 pl-8 border-l border-[#1a1a1a]">
            <div
              className={`w-1.5 h-1.5 rounded-full ${timerStatus === "active" ? "animate-pulse bg-[#8BA888]" : "bg-[#404040]"}`}
            />
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-16 border-r border-[#141414] flex flex-col items-center py-8 gap-8 bg-[#050505] flex-shrink-0">
          {[
            {
              key: "leaderboard",
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
            },
            {
              key: "problems",
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              ),
            },
            {
              key: "people",
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ),
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              className={`p-2 transition-all relative ${activeTab === tab.key ? "text-[#ededed]" : "text-[#222] hover:text-[#404040]"}`}
            >
              {tab.icon}
              {activeTab === tab.key && (
                <div className="absolute left-[-20px] w-1 h-5 bg-[#ededed] rounded-r-full" />
              )}
            </button>
          ))}
          <button
            onClick={() => navigate("/")}
            className="mt-auto mb-4 p-2 text-[#222] hover:text-[#ededed] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </aside>

        <div className="w-72 border-r border-[#141414] bg-[#080808] flex flex-col p-6 gap-6 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#404040]">
            {activeTab}
          </span>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
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

        <main className="flex-1 overflow-y-auto p-12 bg-[#0a0a0a] custom-scrollbar">
          <div className="max-w-3xl mx-auto w-full">
            {selectedProblem ? (
              <ProblemView problem={selectedProblem} />
            ) : (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#1a1a1a]">
                  Observer_Mode
                </span>
                <p className="text-xs text-[#404040] max-w-xs leading-relaxed">
                  Select a challenge from the sidebar to view requirements and
                  constraints.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {kickedOut && (
        <div className="fixed inset-0 bg-[#000]/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-10 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#ef4444] uppercase tracking-[0.3em]">
                Connection Severed
              </span>
              <h2 className="text-xl font-medium text-[#f5f5f5]">
                Session Terminated
              </h2>
              <p className="text-xs text-[#404040] leading-relaxed">
                The host has formally removed your observer access from this
                session.
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 text-[10px] font-bold uppercase tracking-widest bg-[#ededed] text-[#0a0a0a] hover:bg-white transition-all rounded-sm shadow-lg shadow-white/5"
            >
              Exit to Terminal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
