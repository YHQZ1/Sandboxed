/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import api from "../../lib/api";
import { useRoomStore } from "../../store/roomStore";
import type { SubmissionStatus, Language } from "../../types";

interface SubmissionRecord {
  id: string;
  problem_id: string;
  participant_name: string;
  language: Language;
  status: SubmissionStatus;
  score: number;
  time_taken: number | null;
  submitted_at: string;
}

interface Props {
  roomCode: string;
  participantName: string;
  role: "host" | "participant" | "viewer";
  problemId?: string | null;
}

const VERDICT_STYLE: Record<SubmissionStatus, string> = {
  accepted: "text-[#ededed] border border-[#262626] bg-[#171717]",
  wrong_answer: "text-[#ef4444] border border-[#ef4444]/20 bg-[#ef4444]/10",
  tle: "text-[#737373] border border-[#262626]",
  runtime_error: "text-[#ef4444] border border-[#ef4444]/20 bg-[#ef4444]/10",
  compilation_error:
    "text-[#ef4444] border border-[#ef4444]/20 bg-[#ef4444]/10",
  judging: "text-[#ededed] border border-[#262626] animate-pulse",
  queued: "text-[#404040] border border-[#262626]",
};

const VERDICT_SHORT: Record<SubmissionStatus, string> = {
  accepted: "AC",
  wrong_answer: "WA",
  tle: "TLE",
  runtime_error: "RE",
  compilation_error: "CE",
  queued: "QU",
  judging: "...",
};

const LANG_LABEL: Record<Language, string> = {
  python: "Python",
  javascript: "JS",
  cpp: "C++",
  c: "C",
  java: "Java",
};

export default function SubmissionHistory({
  roomCode,
  participantName,
  role,
  problemId,
}: Props) {
  const [localSubmissions, setLocalSubmissions] = useState<SubmissionRecord[]>(
    [],
  );
  const { setSubmissions: setGlobalSubmissions } = useRoomStore();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SubmissionRecord | null>(null);
  const [code, setCode] = useState("");
  const [loadingCode, setLoadingCode] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res =
        role === "host"
          ? await api.get(`/rooms/${roomCode}/submissions`)
          : await api.get(`/rooms/${roomCode}/submissions/${participantName}`);

      const allData: SubmissionRecord[] = res.data.submissions || [];

      if (role === "host") {
        setGlobalSubmissions(allData);
      }

      let filteredData = allData;
      if (problemId) {
        filteredData = allData.filter((s) => s.problem_id === problemId);
      }

      setLocalSubmissions(filteredData);
    } catch {
      // silently handle error
    } finally {
      setLoading(false);
    }
  }, [roomCode, participantName, role, problemId, setGlobalSubmissions]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleViewCode = async (submission: SubmissionRecord) => {
    setSelected(submission);
    setLoadingCode(true);
    try {
      const res = await api.get(`/submissions/${submission.id}`);
      setCode(res.data.submission.code);
    } catch {
      setCode("Unable to load source code");
    } finally {
      setLoadingCode(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#262626] border-t-[#ededed] rounded-full animate-spin" />
      </div>
    );
  }

  if (localSubmissions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-sm text-[#404040]">No submissions yet</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col w-full selection:bg-[#262626]">
        <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-2 px-1">
          <span className="text-sm font-medium text-[#737373]">
            Submissions
          </span>
          <span className="text-xs font-medium text-[#404040]">
            {localSubmissions.length} total
          </span>
        </div>

        <div className="flex flex-col">
          {localSubmissions.map((s) => (
            <div
              key={s.id}
              onClick={() => handleViewCode(s)}
              className="flex items-center gap-4 py-3 border-b border-[#262626]/50 last:border-0 hover:bg-[#111111] cursor-pointer transition-colors px-3 -mx-3 rounded-sm"
            >
              <span
                className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-sm flex-shrink-0 min-w-[36px] text-center ${VERDICT_STYLE[s.status]}`}
              >
                {VERDICT_SHORT[s.status]}
              </span>

              <span className="text-xs font-medium text-[#525252] min-w-[50px]">
                {LANG_LABEL[s.language]}
              </span>

              {role === "host" ? (
                <span className="text-sm font-medium text-[#a3a3a3] flex-1 truncate">
                  {s.participant_name}
                </span>
              ) : (
                <span className="flex-1" />
              )}

              <div className="flex items-center gap-4 flex-shrink-0">
                {s.time_taken && (
                  <span className="text-xs text-[#404040] tabular-nums hidden sm:inline">
                    {s.time_taken}ms
                  </span>
                )}
                {s.status === "accepted" && (
                  <span className="text-xs font-medium text-[#ededed]">
                    +{s.score}pt
                  </span>
                )}
                <span className="text-xs text-[#404040] tabular-nums">
                  {fmt(s.submitted_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-[#0a0a0a]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-sm w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] flex-shrink-0">
              <div className="flex items-center gap-4">
                <span
                  className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-sm ${VERDICT_STYLE[selected.status]}`}
                >
                  {VERDICT_SHORT[selected.status]}
                </span>
                <span className="text-sm font-medium text-[#f5f5f5]">
                  {selected.participant_name}
                </span>
                <span className="text-xs text-[#737373]">
                  {LANG_LABEL[selected.language]}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-xs font-medium text-[#737373] hover:text-[#ededed] transition-colors"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {loadingCode ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-[#262626] border-t-[#ededed] rounded-full animate-spin" />
                </div>
              ) : (
                <pre className="font-mono text-sm text-[#a3a3a3] whitespace-pre-wrap leading-relaxed">
                  {code}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
