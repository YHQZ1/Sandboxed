/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

interface VerdictData {
  status: SubmissionStatus;
  score: number;
  timeTaken?: number;
  memoryUsed?: number;
  problemId?: string;
  submissionId?: string;
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

const VALID_TABS: SideTab[] = [
  "problems",
  "leaderboard",
  "participants",
  "submissions",
];

const ICONS = {
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
  participants: (
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
  submissions: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2} />
    </svg>
  ),
};

export default function ParticipantRoom({ code, socket }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { problems, myRole, myName, solvedProblemIds, markProblemSolved } =
    useRoomStore();
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
  const [verdicts, setVerdicts] = useState<Map<string, VerdictData>>(new Map());
  const [activeTab, setActiveTab] = useState<SideTab>(() => {
    const param = searchParams.get("tab");
    return (
      param && VALID_TABS.includes(param as SideTab) ? param : "problems"
    ) as SideTab;
  });
  const [kickedOut, setKickedOut] = useState(false);
  const [kickReason, setKickReason] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [testEnded, setTestEnded] = useState(false);
  const [showEndTestConfirm, setShowEndTestConfirm] = useState(false);
  const [toast, setToast] = useState<{
    status: SubmissionStatus;
    score: number;
  } | null>(null);
  const [testCaseResults, setTestCaseResults] = useState<
    Array<{
      id: string;
      status: string;
      time_taken: number | null;
      is_sample: boolean;
    }>
  >([]);
  const [showTestCases, setShowTestCases] = useState(false);

  const selectedProblem =
    problems.find((p) => p.id === selectedProblemId) || null;

  const handleTabChange = (tab: SideTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
      if (
        document.visibilityState === "hidden" &&
        timerStatus === "active" &&
        !testEnded
      ) {
        socket.emit("proctor_violation", {
          roomCode: code,
          type: "TAB_SWITCH",
          participant: myName,
        });
      }
    };

    const handleBlur = () => {
      if (timerStatus === "active" && !testEnded) {
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
  }, [timerStatus, testEnded, code, myName, socket]);

  useEffect(() => {
    const handleWarning = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        count: number;
        max: number;
      };
      setViolations(detail.count);
    };
    window.addEventListener("dojo:warning", handleWarning);
    return () => window.removeEventListener("dojo:warning", handleWarning);
  }, []);

  useEffect(() => {
    const handleVerdict = async (data: VerdictData) => {
      const problemId = data.problemId || selectedProblemId;
      if (!problemId) return;

      setVerdicts((prev) => {
        const next = new Map(prev);
        next.set(problemId, {
          status: data.status,
          score: data.score,
          timeTaken: data.timeTaken,
          memoryUsed: data.memoryUsed,
        });
        return next;
      });

      if (data.status === "accepted") markProblemSolved(problemId);
      setSubmitting(false);

      // show toast
      setToast({ status: data.status, score: data.score });
      setTimeout(() => setToast(null), 4000);

      // fetch test case breakdown
      if (data.submissionId) {
        try {
          const res = await api.get(`/submissions/${data.submissionId}`);
          const results = res.data.submission.results || [];
          // mark which ones are sample by cross-referencing with problem test cases
          const sampleIds = new Set(
            (problems.find((p) => p.id === problemId)?.test_cases || [])
              .filter((tc) => tc.is_sample)
              .map((tc) => tc.id),
          );
          setTestCaseResults(
            results.map((r: any) => ({
              ...r,
              is_sample: sampleIds.has(r.test_case_id),
            })),
          );
          setShowTestCases(true);
          setShowOutput(false); // close run output if open
        } catch {
          /* ignore */
        }
      }
    };
    socket.on("verdict", handleVerdict);
    return () => {
      socket.off("verdict", handleVerdict);
    };
  }, [socket, selectedProblemId, markProblemSolved]);

  useEffect(() => {
    if (problems.length > 0 && !selectedProblemId) {
      setSelectedProblemId(problems[0].id);
    }
  }, [problems, selectedProblemId]);

  useEffect(() => {
    const handleKicked = (e: Event) => {
      const reason = (e as CustomEvent).detail as string;
      setKickReason(reason || "You have been removed from the contest.");
      setKickedOut(true);
    };
    window.addEventListener("dojo:kicked", handleKicked);
    return () => window.removeEventListener("dojo:kicked", handleKicked);
  }, []);

  useEffect(() => {
    if (problems.length > 0) {
      problems.forEach((p) => {
        if (localStorage.getItem(`dojo:solved:${p.id}`))
          markProblemSolved(p.id);
      });
    }
  }, [problems]);

  useEffect(() => {
    if (timerStatus !== "active" || testEnded) return;

    const blockKeys = (e: KeyboardEvent) => {
      // block devtools
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C", "K"].includes(e.key)) ||
        (e.ctrlKey && e.key === "U") ||
        (e.metaKey && e.altKey && ["I", "J", "C"].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // block ALL copy paste everywhere — no exceptions
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "a"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // block screenshots
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && e.shiftKey && e.key === "S")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // intercept escape to prevent silent fullscreen exit
      if (e.key === "Escape" && document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const blockDragDrop = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const blockSelectAll = (e: Event) => {
      if (!(e.target as HTMLElement)?.closest?.(".monaco-editor")) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", blockKeys, true);
    document.addEventListener("contextmenu", blockContextMenu, true);
    document.addEventListener("dragover", blockDragDrop, true);
    document.addEventListener("drop", blockDragDrop, true);
    document.addEventListener("selectstart", blockSelectAll, true);

    return () => {
      document.removeEventListener("keydown", blockKeys, true);
      document.removeEventListener("contextmenu", blockContextMenu, true);
      document.removeEventListener("dragover", blockDragDrop, true);
      document.removeEventListener("drop", blockDragDrop, true);
      document.removeEventListener("selectstart", blockSelectAll, true);
    };
  }, [timerStatus, testEnded]);

  useEffect(() => {
    if (timerStatus !== "active" || testEnded) return;

    const detectDevTools = () => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        socket.emit("proctor_violation", {
          roomCode: code,
          type: "DEVTOOLS_OPEN",
          participant: myName,
        });
      }
    };

    const interval = setInterval(detectDevTools, 3000);
    return () => clearInterval(interval);
  }, [timerStatus, testEnded, code, myName, socket]);

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  const handleRun = async () => {
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
            roomCode: code,
            participantName: myName,
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
    if (!selectedProblemId || !code_ || submitting || testEnded) return;
    setSubmitting(true);
    setVerdicts((prev) => {
      const next = new Map(prev);
      next.delete(selectedProblemId);
      return next;
    });
    try {
      await api.post("/submissions", {
        roomCode: code,
        problemId: selectedProblemId,
        participantName: myName,
        language,
        code: code_,
      });
    } catch (err: any) {
      setSubmitting(false);
      const msg = err.response?.data?.error;
      if (msg === "Submission already pending") {
        setToast({ status: "judging", score: 0 });
      }
    }
  };

  const handleEndTest = () => {
    setTestEnded(true);
    setShowEndTestConfirm(false);
    sessionStorage.removeItem(`room:${code}`);
    if (document.fullscreenElement) document.exitFullscreen();
  };

  const handleLeave = () => {
    socket.emit("leave_room", { roomCode: code });
    sessionStorage.removeItem(`room:${code}`);
    if (document.fullscreenElement) document.exitFullscreen();
    navigate("/");
  };

  if (timerStatus === "active" && !isFullscreen && !testEnded) {
    return (
      <div className="fixed inset-0 bg-[#050505] z-[100] flex flex-col items-center justify-center space-y-8 p-6">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-bold text-[#ef4444] uppercase tracking-[0.4em] block">
            Fullscreen Required
          </span>
          <h2 className="text-2xl font-medium tracking-tight text-[#f5f5f5]">
            Enter Fullscreen Mode
          </h2>
          <p className="text-xs text-[#404040] max-w-xs mx-auto leading-relaxed">
            Tab switching and window focus loss are monitored. Violations may
            result in removal.
          </p>
          {violations > 0 && (
            <p className="text-xs text-[#ef4444] mt-2">
              Warnings: {violations} / 4
            </p>
          )}
        </div>
        <button
          onClick={enterFullscreen}
          className="px-10 py-3.5 bg-[#ededed] text-[#050505] text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-white transition-all"
        >
          Enter Fullscreen
        </button>
      </div>
    );
  }

  const currentVerdict = selectedProblemId
    ? (verdicts.get(selectedProblemId) ?? null)
    : null;

  return (
    <div
      className={`h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col overflow-hidden selection:bg-[#262626] ${timerStatus === "active" && !testEnded ? "contest-active" : ""}`}
    >
      <RoomHeader />

      {toast && (
        <div
          className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-sm border shadow-2xl transition-all animate-in slide-in-from-top-2 duration-300 ${
            toast.status === "accepted"
              ? "bg-[#0a1a0a] border-[#8BA888]/30 text-[#8BA888]"
              : toast.status === "compilation_error"
                ? "bg-[#1a0a0a] border-[#C27373]/30 text-[#C27373]"
                : "bg-[#1a0a0a] border-[#C27373]/30 text-[#C27373]"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              toast.status === "accepted" ? "bg-[#8BA888]" : "bg-[#C27373]"
            }`}
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest">
              {VERDICT_LABEL[toast.status]}
            </p>
            {toast.status === "accepted" && toast.score > 0 && (
              <p className="text-[10px] opacity-60 mt-0.5">
                +{toast.score} points added
              </p>
            )}
            {toast.status === "accepted" && toast.score === 0 && (
              <p className="text-[10px] opacity-60 mt-0.5">
                Already solved — no new points
              </p>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-2 opacity-40 hover:opacity-100 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {testEnded && (
        <div className="h-10 bg-[#171717] border-b border-[#262626] flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">
            Test ended — your submissions have been saved
          </span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-14 border-r border-[#262626] flex flex-col items-center py-4 gap-1 flex-shrink-0">
          {Object.entries(ICONS).map(([key, icon]) => (
            <button
              key={key}
              onClick={() => handleTabChange(key as SideTab)}
              title={key.charAt(0).toUpperCase() + key.slice(1)}
              className={`relative w-10 h-10 flex items-center justify-center rounded-sm transition-all
                ${activeTab === key ? "bg-[#171717] text-[#ededed]" : "text-[#525252] hover:text-[#a3a3a3] hover:bg-[#111111]"}`}
            >
              {activeTab === key && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#ededed] rounded-r-full -ml-px" />
              )}
              {icon}
            </button>
          ))}

          {!testEnded && timerStatus === "active" && (
            <button
              onClick={() => setShowEndTestConfirm(true)}
              title="End my test"
              className="mt-2 w-10 h-10 flex items-center justify-center rounded-sm text-[#525252] hover:text-[#8BA888] hover:bg-[#0a1a0a] transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeWidth={2}
                />
              </svg>
            </button>
          )}

          <button
            onClick={() => setShowLeaveConfirm(true)}
            title="Leave room"
            className="mt-auto w-10 h-10 flex items-center justify-center rounded-sm text-[#525252] hover:text-[#ef4444] hover:bg-[#1a0a0a] transition-all"
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
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === "problems" && (
              <ProblemList
                problems={problems}
                selectedId={selectedProblemId}
                solvedIds={solvedProblemIds}
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

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          <div className="lg:w-[42%] overflow-y-auto p-6 lg:p-10 border-b lg:border-b-0 lg:border-r border-[#262626] min-h-0">
            {selectedProblem ? (
              <ProblemView problem={selectedProblem} />
            ) : (
              <div className="flex items-center justify-center min-h-[60vh] text-sm text-[#404040]">
                Select a problem to begin
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-12 flex items-center justify-between px-4 lg:px-6 border-b border-[#262626]">
              <LanguageSelect value={language} onChange={setLanguage} />
              <div className="flex items-center gap-4">
                {currentVerdict && (
                  <div className="flex items-center gap-2 py-1 px-3 bg-[#111] border border-[#262626] rounded-sm">
                    <span
                      className={`text-[10px] font-bold tracking-widest ${VERDICT_COLOR[currentVerdict.status]}`}
                    >
                      {VERDICT_LABEL[currentVerdict.status]}
                    </span>
                    {currentVerdict.status === "accepted" && (
                      <span className="text-[10px] font-bold text-[#ededed] opacity-40">
                        +{currentVerdict.score}PT
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleRun}
                    disabled={running || timerStatus !== "active" || testEnded}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#737373] hover:text-[#ededed] transition-colors disabled:opacity-20"
                  >
                    Run Tests
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={
                      submitting || timerStatus !== "active" || testEnded
                    }
                    className="px-5 py-2 bg-[#ededed] text-[#0a0a0a] text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-white transition-all disabled:opacity-30"
                  >
                    Submit Code
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <CodeEditor
                language={language}
                value={code_}
                onChange={setCode}
                readOnly={timerStatus !== "active" || testEnded}
              />
            </div>

            {(showOutput || showTestCases) && (
              <div className="h-[35%] border-t border-[#262626] flex flex-col min-h-0">
                <div className="px-6 py-3 flex items-center justify-between border-b border-[#262626]">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setShowOutput(true);
                        setShowTestCases(false);
                      }}
                      className={`text-[9px] font-bold tracking-[0.3em] uppercase transition-colors ${showOutput && !showTestCases ? "text-[#ededed]" : "text-[#404040] hover:text-[#737373]"}`}
                    >
                      Run Output
                    </button>
                    {testCaseResults.length > 0 && (
                      <button
                        onClick={() => {
                          setShowTestCases(true);
                          setShowOutput(false);
                        }}
                        className={`text-[9px] font-bold tracking-[0.3em] uppercase transition-colors ${showTestCases ? "text-[#ededed]" : "text-[#404040] hover:text-[#737373]"}`}
                      >
                        Test Cases (
                        {
                          testCaseResults.filter((r) => r.status === "accepted")
                            .length
                        }
                        /{testCaseResults.length})
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowOutput(false);
                      setShowTestCases(false);
                    }}
                    className="text-[#404040] hover:text-[#ededed] text-lg leading-none"
                  >
                    &times;
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {showOutput &&
                    !showTestCases &&
                    (running ? (
                      <div className="text-[10px] text-[#404040] animate-pulse">
                        Executing...
                      </div>
                    ) : (
                      runResults.map((res, i) => (
                        <div key={i} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${res.passed ? "bg-[#8BA888]" : "bg-[#C27373]"}`}
                            />
                            <span
                              className={`text-[10px] font-bold uppercase tracking-widest ${res.passed ? "text-[#8BA888]" : "text-[#C27373]"}`}
                            >
                              Case {i + 1}: {res.passed ? "Passed" : "Failed"}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                              { label: "Input", value: res.input },
                              { label: "Expected", value: res.expected },
                              {
                                label: "Actual",
                                value: res.error || res.actual,
                                isError: !!res.error,
                              },
                            ].map(({ label, value, isError }) => (
                              <div key={label}>
                                <span className="text-[9px] font-bold text-[#404040] uppercase mb-1 block">
                                  {label}
                                </span>
                                <pre
                                  className={`p-3 bg-[#0a0a0a] border border-[#262626] text-[11px] rounded-sm overflow-x-auto ${isError ? "text-[#C27373]" : "text-[#737373]"}`}
                                >
                                  {value || "—"}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ))}

                  {showTestCases && (
                    <div className="space-y-2">
                      {(() => {
                        let sampleCount = 0;
                        let hiddenCount = 0;
                        return testCaseResults.map((r) => {
                          const num = r.is_sample
                            ? ++sampleCount
                            : ++hiddenCount;
                          const label = r.is_sample
                            ? `Test Case ${num}`
                            : `Test Case ${sampleCount + num} (hidden)`;
                          return (
                            <div
                              key={r.id}
                              className="flex items-center gap-3 py-2 border-b border-[#262626]/50 last:border-0"
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.status === "accepted" ? "bg-[#8BA888]" : "bg-[#C27373]"}`}
                              />
                              <span className="text-[10px] text-[#737373] flex-shrink-0 min-w-[140px]">
                                {label}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider flex-1 ${r.status === "accepted" ? "text-[#8BA888]" : "text-[#C27373]"}`}
                              >
                                {r.status === "accepted"
                                  ? "Passed"
                                  : r.status === "tle"
                                    ? "Time Limit Exceeded"
                                    : r.status === "runtime_error"
                                      ? "Runtime Error"
                                      : "Wrong Answer"}
                              </span>
                              {r.time_taken && (
                                <span className="text-[10px] text-[#404040] tabular-nums">
                                  {r.time_taken}ms
                                </span>
                              )}
                            </div>
                          );
                        });
                      })()}
                      <p className="text-[9px] text-[#404040] pt-2">
                        Hidden test cases show status only — inputs and expected
                        outputs are not revealed.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {kickedOut && (
        <div className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#262626] p-10 max-w-sm w-full text-center space-y-6">
            <span className="text-[10px] font-bold text-[#ef4444] uppercase tracking-[0.3em]">
              Disconnected
            </span>
            <h2 className="text-xl font-medium text-[#f5f5f5]">
              Session Terminated
            </h2>
            {kickReason && (
              <p className="text-sm text-[#737373]">{kickReason}</p>
            )}
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 text-[10px] font-bold uppercase tracking-widest bg-[#ededed] text-[#0a0a0a] hover:bg-white transition-all rounded-sm"
            >
              Exit to Home
            </button>
          </div>
        </div>
      )}

      {showEndTestConfirm && (
        <div className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-sm p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-medium tracking-tight text-[#f5f5f5] mb-2">
              End your test?
            </h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed mb-8">
              You won't be able to make any more submissions. Your current score
              will be final.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndTestConfirm(false)}
                className="flex-1 py-2.5 text-sm font-medium bg-transparent border border-[#262626] text-[#ededed] rounded-sm hover:bg-[#171717] transition-colors"
              >
                Keep Going
              </button>
              <button
                onClick={handleEndTest}
                className="flex-1 py-2.5 text-sm font-medium bg-[#ededed] text-[#0a0a0a] rounded-sm hover:bg-white transition-colors"
              >
                End Test
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-sm p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-medium tracking-tight text-[#f5f5f5] mb-2">
              Leave contest?
            </h3>
            <p className="text-sm text-[#a3a3a3] leading-relaxed mb-8">
              Your progress will be saved but you won't be able to rejoin once
              you leave.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 text-sm font-medium bg-transparent border border-[#262626] text-[#ededed] rounded-sm hover:bg-[#171717] transition-colors"
              >
                Stay
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 py-2.5 text-sm font-medium bg-[#ef4444] text-white rounded-sm hover:bg-[#dc2626] transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
