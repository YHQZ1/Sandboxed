import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Socket } from "socket.io-client";
import { useRoomStore } from "../store/roomStore";
import { useTimerStore } from "../store/timerStore";
import RoomCodeShare from "../components/room/RoomCodeShare";
import Leaderboard from "../components/leaderboard/Leaderboard";
import ParticipantList from "../components/room/ParticipantList";
import AddProblemModal from "../components/problems/AddProblemModal";
import ProblemView from "../components/problems/ProblemView";
import LiveFeed from "../components/room/LiveFeed";
import Timer from "../components/timer/Timer";
import SubmissionHistory from "../components/problems/SubmissionHistory";

type Tab = "problems" | "leaderboard" | "people" | "feed";

interface TimerActionsProps {
  status: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onViewResults: () => void;
}

function TimerActions({
  status,
  onStart,
  onPause,
  onResume,
  onEnd,
  onViewResults,
}: TimerActionsProps) {
  if (status === "waiting") {
    return (
      <button
        onClick={onStart}
        className="px-4 py-1.5 text-sm font-medium bg-[#ededed] text-[#0a0a0a] rounded-sm hover:bg-[#d4d4d4] transition-colors"
      >
        Start Contest
      </button>
    );
  }

  if (status === "active") {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={onPause}
          className="px-4 py-1.5 text-sm font-medium bg-transparent border border-[#262626] text-[#ededed] rounded-sm hover:bg-[#171717] transition-colors"
        >
          Pause
        </button>
        <button
          onClick={onEnd}
          className="px-4 py-1.5 text-sm font-medium text-[#ef4444] hover:text-[#f87171] transition-colors rounded-sm"
        >
          End Contest
        </button>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={onResume}
          className="px-4 py-1.5 text-sm font-medium bg-[#ededed] text-[#0a0a0a] rounded-sm hover:bg-[#d4d4d4] transition-colors"
        >
          Resume
        </button>
        <button
          onClick={onEnd}
          className="px-4 py-1.5 text-sm font-medium text-[#ef4444] hover:text-[#f87171] transition-colors rounded-sm"
        >
          End Contest
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onViewResults}
      className="px-4 py-1.5 text-sm font-medium bg-transparent border border-[#262626] text-[#ededed] rounded-sm hover:bg-[#171717] transition-colors"
    >
      View Results
    </button>
  );
}

interface Props {
  code: string;
  socket: Socket;
}

const LABELS = "ABCDEFGHIJ";

const TABS: { key: Tab; label: string }[] = [
  { key: "problems", label: "Problems" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "people", label: "People" },
  { key: "feed", label: "Live Feed" },
];

const VALID_TABS: Tab[] = ["problems", "leaderboard", "people", "feed"];

export default function HostRoom({ code, socket }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { room, problems, submissions } = useRoomStore();
  const { status: timerStatus } = useTimerStore();

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const param = searchParams.get("tab") as Tab;
    return VALID_TABS.includes(param) ? param : "problems";
  });

  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    null,
  );
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const userId = useMemo(() => localStorage.getItem("userId") || "", []);

  const handleTimerStart = () =>
    socket.emit("timer_start", { roomCode: code, userId });
  const handleTimerPause = () =>
    socket.emit("timer_pause", { roomCode: code, userId });
  const handleTimerResume = () =>
    socket.emit("timer_resume", { roomCode: code, userId });
  const handleEndContest = () => {
    socket.emit("timer_end", { roomCode: code, userId });
    setShowEndConfirm(false);
  };
  const handleViewResults = () => navigate(`/results/${code}`);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      prev.set("tab", tab);
      return prev;
    });
  };

  const selectedProblem =
    problems.find((p) => p.id === selectedProblemId) || null;

  const currentProblemSubmissions = submissions.filter(
    (s) => s.problem_id === selectedProblemId,
  );
  const totalAttempts = currentProblemSubmissions.length;
  const acceptedCount = currentProblemSubmissions.filter(
    (s) => s.status === "accepted",
  ).length;
  const passRate =
    totalAttempts > 0 ? Math.round((acceptedCount / totalAttempts) * 100) : 0;

  return (
    <div className="h-screen w-full bg-[#0a0a0a] text-[#ededed] flex flex-col overflow-hidden selection:bg-[#262626] selection:text-[#ededed]">
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#262626] flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-lg font-medium tracking-tight text-[#f5f5f5]">
            Sandboxed.
          </span>
          <span className="text-[#404040] hidden sm:inline">/</span>
          <span className="text-sm font-medium text-[#a3a3a3] truncate max-w-[160px] sm:max-w-[240px]">
            {room?.name}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#171717] border border-[#262626] text-[#737373] px-2 py-0.5 rounded-sm hidden sm:inline">
            Host
          </span>
          <div className="hidden md:block">
            <RoomCodeShare />
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <Timer />
          <div className="flex items-center gap-3 pl-4 sm:pl-6 border-l border-[#262626]">
            <TimerActions
              status={timerStatus}
              onStart={handleTimerStart}
              onPause={handleTimerPause}
              onResume={handleTimerResume}
              onEnd={() => setShowEndConfirm(true)}
              onViewResults={handleViewResults}
            />
          </div>
        </div>
      </header>

      <nav className="flex items-center gap-6 sm:gap-8 px-6 border-b border-[#262626] flex-shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`py-3.5 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.key
                ? "text-[#ededed]"
                : "text-[#737373] hover:text-[#a3a3a3]"
            }`}
          >
            {tab.label}
            {tab.key === "feed" && (
              <span className="w-1.5 h-1.5 bg-[#ededed] rounded-full animate-pulse opacity-80" />
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-px bg-[#ededed]" />
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {activeTab === "problems" && (
          <div className="flex-1 flex overflow-hidden w-full min-h-0">
            <div className="w-64 lg:w-80 border-r border-[#262626] flex flex-col flex-shrink-0">
              <div className="flex items-center justify-between px-4 py-4 border-b border-[#262626]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                  Problem Set
                </span>
                <button
                  onClick={() => setShowAddProblem(true)}
                  className="text-xs font-medium text-[#ededed] bg-[#171717] border border-[#262626] px-2.5 py-1 rounded-sm hover:bg-[#262626] transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5 min-h-0">
                {problems.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-[#404040]">No problems yet</p>
                  </div>
                ) : (
                  problems.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProblemId(p.id)}
                      className={`text-left px-3 py-2.5 rounded-sm text-sm transition-colors flex items-center justify-between ${
                        selectedProblemId === p.id
                          ? "bg-[#171717] text-[#ededed]"
                          : "text-[#a3a3a3] hover:text-[#ededed] hover:bg-[#111111]"
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className="text-[#737373] font-medium w-5 text-center">
                          {LABELS[i]}
                        </span>
                        <span className="truncate">{p.title}</span>
                      </div>
                      <span className="text-[#737373] text-xs ml-3 flex-shrink-0">
                        {p.points}pt
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-10 min-h-0">
              <div className="max-w-3xl mx-auto w-full">
                {selectedProblem ? (
                  <div className="w-full">
                    <div className="flex items-end justify-between mb-8 pb-4 border-b border-[#262626]">
                      <h2 className="text-xl lg:text-2xl font-medium tracking-tight text-[#f5f5f5]">
                        {selectedProblem.title}
                      </h2>
                    </div>
                    <ProblemView problem={selectedProblem} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <p className="text-lg text-[#404040] tracking-wide">
                      Select a challenge to monitor
                    </p>
                  </div>
                )}
              </div>
            </div>

            {selectedProblem && (
              <div className="hidden xl:flex w-80 2xl:w-[360px] flex-shrink-0 border-l border-[#262626] p-6 flex-col gap-8">
                <section>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#404040] mb-4">
                    Live Analytics
                  </h3>
                  <div className="grid grid-cols-2 gap-px bg-[#262626] border border-[#262626] rounded-sm overflow-hidden">
                    <div className="bg-[#0a0a0a] p-4">
                      <p className="text-[10px] text-[#737373] uppercase mb-1 font-semibold">
                        Pass Rate
                      </p>
                      <p className="text-2xl font-medium text-[#ededed] tabular-nums">
                        {passRate}%
                      </p>
                    </div>
                    <div className="bg-[#0a0a0a] p-4">
                      <p className="text-[10px] text-[#737373] uppercase mb-1 font-semibold">
                        Tries
                      </p>
                      <p className="text-2xl font-medium text-[#ededed] tabular-nums">
                        {totalAttempts}
                      </p>
                    </div>
                  </div>
                </section>
                <section className="flex-1 flex flex-col min-h-0">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#404040] mb-4">
                    Recent Attempts
                  </h3>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <SubmissionHistory
                      roomCode={code}
                      participantName=""
                      role="host"
                      problemId={selectedProblemId}
                    />
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div className="max-w-3xl mx-auto w-full">
              <Leaderboard />
            </div>
          </div>
        )}

        {activeTab === "people" && (
          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div className="max-w-3xl mx-auto w-full">
              <ParticipantList showKick hostCode={code} socket={socket} />
            </div>
          </div>
        )}

        {activeTab === "feed" && (
          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div className="max-w-3xl mx-auto w-full">
              <LiveFeed />
            </div>
          </div>
        )}
      </main>

      {showAddProblem && (
        <AddProblemModal
          roomCode={code}
          onClose={() => setShowAddProblem(false)}
          onAdded={() => {}}
        />
      )}

      {showEndConfirm && (
        <div className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-sm p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-medium tracking-tight text-[#f5f5f5] mb-2">
              End contest early?
            </h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed mb-8">
              This will immediately lock the room and stop all execution. This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 text-sm font-medium bg-transparent border border-[#262626] text-[#ededed] rounded-sm hover:bg-[#171717] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEndContest}
                className="flex-1 py-2.5 text-sm font-medium bg-[#ef4444] text-white rounded-sm hover:bg-[#dc2626] transition-colors"
              >
                End Contest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
