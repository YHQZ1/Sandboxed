/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";
import { useRoomStore } from "../store/roomStore";
import { useTimerStore } from "../store/timerStore";
import RoomHeader from "../components/room/RoomHeader";
import ProblemList from "../components/problems/ProblemList";
import ProblemView from "../components/problems/ProblemView";
import CodeEditor from "../components/editor/CodeEditor";
import LanguageSelect from "../components/editor/LanguageSelect";
import Leaderboard from "../components/leaderboard/Leaderboard";
import ParticipantList from "../components/room/ParticipantList";
import SubmissionHistory from "../components/problems/SubmissionHistory";
import type { Language, SubmissionStatus } from "../types";
import api from "../lib/api";

interface Props {
  code: string;
  socket: Socket;
}

interface RunResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error: string;
}

const DEFAULT_CODE: Record<Language, string> = {
  python: "# Write your solution here\n",
  javascript: "// Write your solution here\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}\n",
  java: "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}\n",
};

const VERDICT_COLOR: Record<SubmissionStatus, string> = {
  accepted: "text-[#8BA888]",
  wrong_answer: "text-[#C27373]",
  tle: "text-[#737373]",
  runtime_error: "text-[#C27373]",
  compilation_error: "text-[#C27373]",
  queued: "text-[#404040]",
  judging: "text-[#a3a3a3]",
};

const VERDICT_LABEL: Record<SubmissionStatus, string> = {
  accepted: "ACCEPTED",
  wrong_answer: "WRONG ANSWER",
  tle: "TIME LIMIT EXCEEDED",
  runtime_error: "RUNTIME ERROR",
  compilation_error: "COMPILATION ERROR",
  queued: "QUEUED",
  judging: "JUDGING...",
};

type SideTab = "problems" | "leaderboard" | "participants" | "submissions";

export default function ParticipantRoom({ code, socket }: Props) {
  const navigate = useNavigate();
  const { problems, myRole, myName } = useRoomStore();
  const { status: timerStatus } = useTimerStore();

  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    null,
  );
  const [language, setLanguage] = useState<Language>("python");
  const [code_, setCode] = useState("");
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<{
    status: SubmissionStatus;
    score: number;
    time?: number;
    memory?: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<SideTab>("problems");
  const [kickedOut, setKickedOut] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (selectedProblemId) {
      const saved = localStorage.getItem(
        `dojo:v1:${code}:${selectedProblemId}:${language}`,
      );
      setCode(saved || DEFAULT_CODE[language]);
    }
  }, [selectedProblemId, language, code]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedProblemId && code_) {
        localStorage.setItem(
          `dojo:v1:${code}:${selectedProblemId}:${language}`,
          code_,
        );
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [code_, selectedProblemId, language, code]);

  useEffect(() => {
    const handleFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && timerStatus === "active") {
        socket.emit("proctor_violation", {
          roomCode: code,
          type: "TAB_SWITCH",
          participant: myName,
        });
      }
    };

    const handleBlur = () => {
      if (timerStatus === "active") {
        socket.emit("proctor_violation", {
          roomCode: code,
          type: "WINDOW_BLUR",
          participant: myName,
        });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [timerStatus, code, myName, socket]);

  useEffect(() => {
    socket.on("verdict", (data: any) => {
      setLastVerdict({
        status: data.status,
        score: data.score,
        time: data.time_taken,
        memory: data.memory_used,
      });
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
  }, [problems, selectedProblemId]);

  useEffect(() => {
    const handleKicked = () => setKickedOut(true);
    window.addEventListener("dojo:kicked", handleKicked);
    return () => window.removeEventListener("dojo:kicked", handleKicked);
  }, []);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen().catch(() => {});
  };

  const handleLanguageChange = (lang: Language) => setLanguage(lang);

  const handleRun = async () => {
    const selectedProblem = problems.find((p) => p.id === selectedProblemId);
    if (!selectedProblem || !code_ || running) return;
    setRunning(true);
    setShowOutput(true);
    const sampleCases =
      selectedProblem.test_cases?.filter((tc) => tc.is_sample) || [];
    try {
      const results = await Promise.all(
        sampleCases.map(async (tc) => {
          const res = await api.post("/run", {
            language,
            code: code_,
            input: tc.input,
            timeLimit: selectedProblem.time_limit || 5,
            memoryLimit: selectedProblem.memory_limit || 256,
          });
          return {
            input: tc.input,
            expected: tc.expected_output.trim(),
            actual: (res.data.output || "").trim(),
            passed:
              !res.data.error &&
              res.data.output.trim() === tc.expected_output.trim(),
            error: res.data.error || "",
          };
        }),
      );
      setRunResults(results);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProblemId || !code_ || submitting) return;
    setSubmitting(true);
    setLastVerdict(null);
    try {
      await api.post("/submissions", {
        roomCode: code,
        problemId: selectedProblemId,
        participantName: myName,
        language,
        code: code_,
      });
    } catch {
      setSubmitting(false);
    }
  };

  const handleLeave = () => {
    socket.emit("leave_room", { roomCode: code });
    sessionStorage.removeItem(`room:${code}`);
    if (document.fullscreenElement) document.exitFullscreen();
    navigate("/");
  };

  const selectedProblem =
    problems.find((p) => p.id === selectedProblemId) || null;

  if (timerStatus === "active" && !isFullscreen) {
    return (
      <div className="fixed inset-0 bg-[#050505] z-[100] flex flex-col items-center justify-center space-y-8 p-6 selection:bg-transparent">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-bold text-[#ef4444] uppercase tracking-[0.4em] block">
            Security_Protocol_Active
          </span>
          <h2 className="text-2xl font-medium tracking-tight text-[#f5f5f5]">
            Lockdown Mode Required
          </h2>
          <p className="text-xs text-[#404040] max-w-xs mx-auto leading-relaxed">
            External navigation, tab switching, and window focus loss are
            strictly monitored during this session.
          </p>
        </div>
        <button
          onClick={enterFullscreen}
          className="px-10 py-3.5 bg-[#ededed] text-[#050505] text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-white transition-all shadow-xl shadow-white/5"
        >
          Enter Fullscreen
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#050505] text-[#ededed] flex flex-col overflow-hidden selection:bg-[#262626]">
      <RoomHeader />
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-14 border-r border-[#141414] flex flex-col items-center py-6 gap-8 bg-[#050505] z-20 flex-shrink-0">
          {[
            {
              key: "problems",
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 6h16M4 12h16M4 18h7" strokeWidth={2} />
                </svg>
              ),
            },
            {
              key: "leaderboard",
              icon: (
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
            },
            {
              key: "participants",
              icon: (
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
            },
            {
              key: "submissions",
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeWidth={2}
                  />
                </svg>
              ),
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as SideTab)}
              className={`p-2 transition-all ${activeTab === tab.key ? "text-[#ededed]" : "text-[#333] hover:text-[#737373]"}`}
            >
              {tab.icon}
            </button>
          ))}
          <button
            onClick={handleLeave}
            className="mt-auto mb-4 p-2 text-[#333] hover:text-[#ef4444] transition-colors"
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

        <div className="w-72 border-r border-[#141414] bg-[#080808] flex flex-col p-6 gap-6 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#404040]">
            {activeTab}
          </span>
          <div className="flex-1 overflow-y-auto">
            {activeTab === "problems" && (
              <ProblemList
                problems={problems}
                selectedId={selectedProblemId}
                onSelect={setSelectedProblemId}
              />
            )}
            {activeTab === "leaderboard" && <Leaderboard />}
            {activeTab === "participants" && <ParticipantList />}
            {activeTab === "submissions" && (
              <SubmissionHistory
                roomCode={code}
                participantName={myName}
                role={myRole || "participant"}
                problemId={selectedProblemId}
              />
            )}
          </div>
        </div>

        <div className="flex-1 flex bg-[#0a0a0a]">
          <div className="w-[42%] overflow-y-auto p-12 bg-[#080808]/50">
            {selectedProblem ? (
              <ProblemView problem={selectedProblem} />
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] text-[#333]">
                AWAITING_CHALLENGE
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col border-l border-[#141414]">
            <div className="h-14 flex items-center justify-between px-8 bg-[#050505]/50 backdrop-blur-md z-10">
              <LanguageSelect
                value={language}
                onChange={handleLanguageChange}
              />
              <div className="flex items-center gap-8">
                {lastVerdict && (
                  <div className="flex items-center gap-4 py-1 px-3 bg-[#111] border border-[#1a1a1a] rounded-sm">
                    <span
                      className={`text-[10px] font-bold tracking-widest ${VERDICT_COLOR[lastVerdict.status]}`}
                    >
                      {VERDICT_LABEL[lastVerdict.status]}
                    </span>
                    {lastVerdict.status === "accepted" && (
                      <span className="text-[10px] font-bold text-[#ededed] opacity-40">
                        +{lastVerdict.score}PT
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-4">
                  <button
                    onClick={handleRun}
                    disabled={running || timerStatus !== "active"}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#737373] hover:text-[#ededed] transition-colors disabled:opacity-10"
                  >
                    Run_Tests
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || timerStatus !== "active"}
                    className="px-6 py-2 bg-[#ededed] text-[#050505] text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-white transition-all disabled:opacity-30"
                  >
                    Submit_Code
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <CodeEditor
                language={language}
                value={code_}
                onChange={setCode}
                readOnly={timerStatus !== "active"}
              />
            </div>

            {showOutput && (
              <div className="h-[35%] bg-[#050505] border-t border-[#141414] flex flex-col">
                <div className="px-8 py-3 flex items-center justify-between border-b border-[#141414]">
                  <span className="text-[9px] font-bold tracking-[0.3em] text-[#404040]">
                    CONSOLE_REPORTS
                  </span>
                  <button
                    onClick={() => setShowOutput(false)}
                    className="text-[#404040] hover:text-[#ededed] text-lg"
                  >
                    &times;
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  {running ? (
                    <div className="text-[10px] text-[#404040] animate-pulse">
                      SYSTEM_EXECUTING...
                    </div>
                  ) : (
                    runResults.map((res, i) => (
                      <div key={i} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${res.passed ? "bg-[#8BA888]" : "bg-[#C27373]"}`}
                          />
                          <span
                            className={`text-[10px] font-bold uppercase tracking-widest ${res.passed ? "text-[#8BA888]" : "text-[#C27373]"}`}
                          >
                            CASE_{i + 1}: {res.passed ? "SUCCESS" : "FAILURE"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-8">
                          {[
                            { l: "In", v: res.input },
                            { l: "Exp", v: res.expected },
                            {
                              l: "Act",
                              v: res.error || res.actual,
                              e: !!res.error,
                            },
                          ].map((x) => (
                            <div key={x.l}>
                              <span className="text-[9px] font-bold text-[#333] uppercase mb-2 block">
                                {x.l}
                              </span>
                              <pre
                                className={`p-3 bg-[#080808] border border-[#141414] text-[11px] rounded-sm overflow-x-auto ${x.e ? "text-[#C27373]" : "text-[#737373]"}`}
                              >
                                {x.v || "null"}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {kickedOut && (
        <div className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-10 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <span className="text-[10px] font-bold text-[#C27373] uppercase tracking-[0.3em]">
              Disconnected
            </span>
            <h2 className="text-xl font-medium text-[#f5f5f5]">
              Session Terminated
            </h2>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 text-[10px] font-bold uppercase tracking-widest bg-[#ef4444] text-[#0a0a0a] hover:bg-[#f87171] transition-colors rounded-sm"
            >
              Exit to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
