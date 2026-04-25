import { useState, useEffect } from "react";
import api from "../../lib/api";
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

const VERDICT_COLOR: Record<SubmissionStatus, string> = {
  accepted: "text-green-400 bg-green-400/10",
  wrong_answer: "text-red-400 bg-red-400/10",
  tle: "text-yellow-400 bg-yellow-400/10",
  runtime_error: "text-orange-400 bg-orange-400/10",
  compilation_error: "text-red-500 bg-red-500/10",
  queued: "text-zinc-400 bg-zinc-400/10",
  judging: "text-blue-400 bg-blue-400/10",
};

const VERDICT_LABEL: Record<SubmissionStatus, string> = {
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
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SubmissionRecord | null>(null);
  const [code, setCode] = useState<string>("");
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [roomCode, participantName, problemId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      let res;
      if (role === "host") {
        res = await api.get(`/rooms/${roomCode}/submissions`);
      } else {
        res = await api.get(
          `/rooms/${roomCode}/submissions/${participantName}`,
        );
      }
      let data: SubmissionRecord[] = res.data.submissions || [];
      if (problemId) {
        data = data.filter((s) => s.problem_id === problemId);
      }
      setSubmissions(data);
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCode = async (submission: SubmissionRecord) => {
    setSelected(submission);
    setLoadingCode(true);
    try {
      const res = await api.get(`/submissions/${submission.id}`);
      setCode(res.data.submission.code);
    } catch (err) {
      setCode("Failed to load code");
    } finally {
      setLoadingCode(false);
    }
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-zinc-600 text-sm">Loading submissions...</span>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-zinc-600 text-sm">No submissions yet</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        {submissions.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-zinc-800 cursor-pointer transition group"
            onClick={() => handleViewCode(s)}
          >
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded font-mono ${VERDICT_COLOR[s.status]}`}
            >
              {VERDICT_LABEL[s.status]}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {LANG_LABEL[s.language]}
            </span>
            {role === "host" && (
              <span className="text-xs text-zinc-400 flex-1 truncate">
                {s.participant_name}
              </span>
            )}
            {role !== "host" && <span className="flex-1" />}
            {s.time_taken && (
              <span className="text-xs text-zinc-600">{s.time_taken}ms</span>
            )}
            {s.status === "accepted" && (
              <span className="text-xs text-green-400">+{s.score}pt</span>
            )}
            <span className="text-xs text-zinc-600">{fmt(s.submitted_at)}</span>
          </div>
        ))}
      </div>

      {/* Code viewer modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded font-mono ${VERDICT_COLOR[selected.status]}`}
                >
                  {VERDICT_LABEL[selected.status]}
                </span>
                <span className="text-sm font-medium">
                  {selected.participant_name}
                </span>
                <span className="text-xs text-zinc-500">
                  {LANG_LABEL[selected.language]}
                </span>
                {selected.time_taken && (
                  <span className="text-xs text-zinc-600">
                    {selected.time_taken}ms
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-zinc-500 hover:text-white transition text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingCode ? (
                <p className="text-zinc-500 text-sm">Loading code...</p>
              ) : (
                <pre className="text-sm text-zinc-200 font-mono whitespace-pre-wrap">
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
