/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import { useRoomStore } from "../store/roomStore";
import { useTimerStore } from "../store/timerStore";
import RoomHeader from "../components/room/RoomHeader";
import ProblemList from "../components/problems/ProblemList";
import ProblemView from "../components/problems/ProblemView";
import CodeEditor from "../components/editor/CodeEditor";
import LanguageSelect from "../components/editor/LanguageSelect";
import Leaderboard from "../components/leaderboard/Leaderboard";
import ParticipantList from "../components/room/ParticipantList";
import AddProblemModal from "../components/problems/AddProblemModal";
import SubmissionHistory from "../components/problems/SubmissionHistory";
import type { Language, SubmissionStatus } from "../types";
import api from "../lib/api";

const DEFAULT_CODE: Record<Language, string> = {
  python: "# Write your solution here\n",
  javascript: "// Write your solution here\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    return 0;\n}\n",
  c: "#include <stdio.h>\nint main() {\n    return 0;\n}\n",
  java: "import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}\n",
};

const VERDICT_COLOR: Record<SubmissionStatus, string> = {
  accepted: "text-green-400",
  wrong_answer: "text-red-400",
  tle: "text-yellow-400",
  runtime_error: "text-orange-400",
  compilation_error: "text-red-500",
  queued: "text-zinc-400",
  judging: "text-blue-400",
};

const VERDICT_LABEL: Record<SubmissionStatus, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  tle: "Time Limit Exceeded",
  runtime_error: "Runtime Error",
  compilation_error: "Compilation Error",
  queued: "Queued",
  judging: "Judging...",
};

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    name: string;
    role: "host" | "participant" | "viewer";
  } | null;

  const { problems, myRole, setMyIdentity } = useRoomStore();
  const { status: timerStatus } = useTimerStore();

  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    null,
  );
  const [language, setLanguage] = useState<Language>("python");
  const [code_, setCode] = useState(DEFAULT_CODE["python"]);
  const [submitting, setSubmitting] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<{
    status: SubmissionStatus;
    score: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<
    "problems" | "leaderboard" | "participants" | "submissions"
  >("problems");
  const [showAddProblem, setShowAddProblem] = useState(false);

  useEffect(() => {
    if (!state?.name) {
      navigate("/join");
      return;
    }
    setMyIdentity(state.name, state.role);
  }, []);

  const socket = useSocket(code!, state?.name || "", state?.role || "viewer");

  useEffect(() => {
    socket.on("verdict", (data: any) => {
      setLastVerdict({ status: data.status, score: data.score });
      setSubmitting(false);
    });
    return () => {
      socket.off("verdict");
    };
  }, [socket]);

  useEffect(() => {
    if (problems.length > 0 && !selectedProblemId) {
      setSelectedProblemId(problems[0].id);
    }
  }, [problems]);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang]);
  };

  const handleSubmit = async () => {
    if (!selectedProblemId || !code_ || submitting) return;
    setSubmitting(true);
    setLastVerdict(null);
    try {
      await api.post("/submissions", {
        roomCode: code,
        problemId: selectedProblemId,
        participantName: state?.name,
        language,
        code: code_,
      });
    } catch (err: any) {
      setLastVerdict({ status: "runtime_error", score: 0 });
      setSubmitting(false);
    }
  };

  const handleTimerStart = () => {
    const userId = localStorage.getItem("userId") || "";
    socket.emit("timer_start", { roomCode: code, userId });
  };

  const handleTimerPause = () => {
    const userId = localStorage.getItem("userId") || "";
    socket.emit("timer_pause", { roomCode: code, userId });
  };

  const handleTimerResume = () => {
    const userId = localStorage.getItem("userId") || "";
    socket.emit("timer_resume", { roomCode: code, userId });
  };

  const selectedProblem =
    problems.find((p) => p.id === selectedProblemId) || null;

  if (!state?.name) return null;

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      <RoomHeader />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r border-zinc-800 flex flex-col flex-shrink-0">
          <div className="flex border-b border-zinc-800">
            {(
              [
                "problems",
                "leaderboard",
                "participants",
                "submissions",
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium capitalize transition ${
                  activeTab === tab
                    ? "text-white border-b-2 border-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab === "participants"
                  ? "People"
                  : tab === "submissions"
                    ? "History"
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === "problems" && (
              <div className="flex flex-col gap-2">
                {myRole === "host" && (
                  <button
                    onClick={() => setShowAddProblem(true)}
                    className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition text-xs"
                  >
                    + Add Problem
                  </button>
                )}
                {problems.length === 0 ? (
                  <p className="text-zinc-600 text-xs text-center py-8">
                    {myRole === "host"
                      ? "No problems yet. Add one above."
                      : "Waiting for host to add problems..."}
                  </p>
                ) : (
                  <ProblemList
                    problems={problems}
                    selectedId={selectedProblemId}
                    onSelect={setSelectedProblemId}
                  />
                )}
              </div>
            )}
            {activeTab === "leaderboard" && <Leaderboard />}
            {activeTab === "participants" && <ParticipantList />}
            {activeTab === "submissions" && (
              <SubmissionHistory
                roomCode={code!}
                participantName={state?.name || ""}
                role={myRole || "viewer"}
                problemId={selectedProblemId}
              />
            )}
          </div>

          {myRole === "host" && (
            <div className="p-3 border-t border-zinc-800 flex flex-col gap-2">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Timer Controls
              </p>
              {timerStatus === "waiting" && (
                <button
                  onClick={handleTimerStart}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition"
                >
                  Start Contest
                </button>
              )}
              {timerStatus === "active" && (
                <button
                  onClick={handleTimerPause}
                  className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-medium transition"
                >
                  Pause
                </button>
              )}
              {timerStatus === "paused" && (
                <button
                  onClick={handleTimerResume}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition"
                >
                  Resume
                </button>
              )}
              {timerStatus === "ended" && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-red-400 text-center">
                    Contest has ended
                  </p>
                  {myRole === "host" && (
                    <button
                      onClick={() => navigate(`/results/${code}`)}
                      className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium transition"
                    >
                      View Results
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-2/5 border-r border-zinc-800 overflow-y-auto p-6 flex-shrink-0">
            {selectedProblem ? (
              <ProblemView problem={selectedProblem} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-zinc-600 text-sm">
                  {problems.length === 0
                    ? "Waiting for problems..."
                    : "Select a problem from the left"}
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900 flex-shrink-0">
              <LanguageSelect
                value={language}
                onChange={handleLanguageChange}
              />
              <div className="flex items-center gap-3">
                {lastVerdict && (
                  <span
                    className={`text-sm font-medium ${VERDICT_COLOR[lastVerdict.status]}`}
                  >
                    {VERDICT_LABEL[lastVerdict.status]}
                    {lastVerdict.status === "accepted" && (
                      <span className="ml-1 text-green-400">
                        +{lastVerdict.score}pt
                      </span>
                    )}
                  </span>
                )}
                {submitting && (
                  <span className="text-blue-400 text-sm animate-pulse">
                    Judging...
                  </span>
                )}
                {myRole === "participant" && timerStatus === "active" && (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !selectedProblemId}
                    className="px-4 py-1.5 bg-white text-black font-semibold text-sm rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
                  >
                    Submit
                  </button>
                )}
                {myRole === "viewer" && (
                  <span className="text-zinc-600 text-xs">Viewer mode</span>
                )}
                {timerStatus === "waiting" && myRole === "participant" && (
                  <span className="text-zinc-500 text-xs">
                    Waiting for contest to start...
                  </span>
                )}
                {timerStatus === "ended" && (
                  <span className="text-red-400 text-xs">Contest ended</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <CodeEditor
                language={language}
                value={code_}
                onChange={setCode}
                readOnly={myRole !== "participant" || timerStatus !== "active"}
              />
            </div>
          </div>
        </div>
      </div>

      {showAddProblem && (
        <AddProblemModal
          roomCode={code!}
          onClose={() => setShowAddProblem(false)}
          onAdded={() => {}}
        />
      )}
    </div>
  );
}
