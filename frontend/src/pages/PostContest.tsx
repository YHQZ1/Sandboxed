import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { SubmissionStatus, Language } from "../types";

interface ParticipantSummary {
  name: string;
  score: number;
  solvedCount: number;
  submissions: SubmissionRecord[];
}

interface SubmissionRecord {
  id: string;
  problem_id: string;
  participant_name: string;
  language: Language;
  status: SubmissionStatus;
  score: number;
  time_taken: number | null;
  submitted_at: string;
  code?: string;
}

interface Problem {
  id: string;
  title: string;
  points: number;
  order_index: number;
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

export default function PostContest() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(
    null,
  );
  const [selectedCode, setSelectedCode] = useState<{
    code: string;
    language: Language;
    status: SubmissionStatus;
  } | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    fetchData();
  }, [code]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [roomRes, submissionsRes] = await Promise.all([
        api.get(`/rooms/${code}`),
        api.get(`/rooms/${code}/submissions`),
      ]);

      const problemsData: Problem[] = roomRes.data.problems || [];
      setProblems(problemsData.sort((a, b) => a.order_index - b.order_index));

      const allSubmissions: SubmissionRecord[] =
        submissionsRes.data.submissions || [];

      // group by participant
      const map = new Map<string, ParticipantSummary>();
      for (const s of allSubmissions) {
        if (!map.has(s.participant_name)) {
          map.set(s.participant_name, {
            name: s.participant_name,
            score: 0,
            solvedCount: 0,
            submissions: [],
          });
        }
        map.get(s.participant_name)!.submissions.push(s);
        if (s.status === "accepted") {
          map.get(s.participant_name)!.score += s.score;
          map.get(s.participant_name)!.solvedCount += 1;
        }
      }

      // sort by score desc
      const sorted = Array.from(map.values()).sort((a, b) => b.score - a.score);
      setParticipants(sorted);

      if (sorted.length > 0) setSelectedParticipant(sorted[0].name);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load contest data");
    } finally {
      setLoading(false);
    }
  };

  const handleViewCode = async (submissionId: string) => {
    setLoadingCode(true);
    try {
      const res = await api.get(`/submissions/${submissionId}`);
      const s = res.data.submission;
      setSelectedCode({ code: s.code, language: s.language, status: s.status });
    } catch {
      setSelectedCode({
        code: "Failed to load code",
        language: "python",
        status: "runtime_error",
      });
    } finally {
      setLoadingCode(false);
    }
  };

  const selectedSummary = participants.find(
    (p) => p.name === selectedParticipant,
  );

  const getBestSubmission = (participantName: string, problemId: string) => {
    const p = participants.find((p) => p.name === participantName);
    if (!p) return null;
    const subs = p.submissions.filter((s) => s.problem_id === problemId);
    const accepted = subs.find((s) => s.status === "accepted");
    if (accepted) return accepted;
    return subs[subs.length - 1] || null;
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const medals = ["🥇", "🥈", "🥉"];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-500">Loading contest results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="text-zinc-400 hover:text-white text-sm"
          >
            ← Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black">🥋</span>
          <div>
            <h1 className="font-bold text-lg">Contest Results</h1>
            <span className="font-mono text-xs text-zinc-500">{code}</span>
          </div>
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-zinc-500 hover:text-white transition text-sm"
        >
          ← Home
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        {/* Top 3 podium */}
        {participants.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Final Standings
            </h2>
            <div className="flex gap-4 flex-wrap">
              {participants.slice(0, 3).map((p, i) => (
                <div
                  key={p.name}
                  className="flex-1 min-w-32 bg-zinc-800 rounded-xl p-4 text-center cursor-pointer hover:bg-zinc-700 transition"
                  onClick={() => setSelectedParticipant(p.name)}
                >
                  <div className="text-2xl mb-1">
                    {medals[i] || `#${i + 1}`}
                  </div>
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-zinc-400 text-xs mt-1">
                    {p.solvedCount} solved
                  </div>
                  <div className="font-mono font-bold text-lg mt-1">
                    {p.score}pt
                  </div>
                </div>
              ))}
              {participants.slice(3).map((p, i) => (
                <div
                  key={p.name}
                  className="flex-1 min-w-32 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center cursor-pointer hover:bg-zinc-800 transition"
                  onClick={() => setSelectedParticipant(p.name)}
                >
                  <div className="text-zinc-500 text-sm mb-1">#{i + 4}</div>
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-zinc-400 text-xs mt-1">
                    {p.solvedCount} solved
                  </div>
                  <div className="font-mono font-bold text-lg mt-1">
                    {p.score}pt
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problem grid */}
        {participants.length > 0 && problems.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Submission Matrix
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                      Participant
                    </th>
                    <th className="text-center px-4 py-3 text-zinc-500 font-medium">
                      Score
                    </th>
                    {problems.map((p, i) => (
                      <th
                        key={p.id}
                        className="text-center px-4 py-3 text-zinc-500 font-medium"
                      >
                        {String.fromCharCode(65 + i)}
                        <span className="block text-xs font-normal text-zinc-600">
                          {p.points}pt
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant, idx) => (
                    <tr
                      key={participant.name}
                      className={`border-b border-zinc-800/50 cursor-pointer transition ${
                        selectedParticipant === participant.name
                          ? "bg-zinc-800"
                          : "hover:bg-zinc-800/50"
                      }`}
                      onClick={() => setSelectedParticipant(participant.name)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600 text-xs w-4">
                            #{idx + 1}
                          </span>
                          <span className="font-medium">
                            {participant.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold">
                        {participant.score}
                      </td>
                      {problems.map((problem) => {
                        const best = getBestSubmission(
                          participant.name,
                          problem.id,
                        );
                        return (
                          <td
                            key={problem.id}
                            className="px-4 py-3 text-center"
                          >
                            {best ? (
                              <span
                                className={`text-xs font-bold px-2 py-1 rounded font-mono ${VERDICT_COLOR[best.status]}`}
                              >
                                {VERDICT_SHORT[best.status]}
                              </span>
                            ) : (
                              <span className="text-zinc-700 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Selected participant detail */}
        {selectedSummary && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold">
                {selectedSummary.name}'s Submissions
              </h2>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span>{selectedSummary.solvedCount} solved</span>
                <span className="font-mono font-bold text-white">
                  {selectedSummary.score}pt
                </span>
              </div>
            </div>
            <div className="divide-y divide-zinc-800">
              {selectedSummary.submissions.length === 0 ? (
                <p className="px-6 py-4 text-zinc-600 text-sm">
                  No submissions
                </p>
              ) : (
                selectedSummary.submissions.map((s) => (
                  <div
                    key={s.id}
                    className="px-6 py-3 flex items-center gap-3 hover:bg-zinc-800 cursor-pointer transition"
                    onClick={() => handleViewCode(s.id)}
                  >
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded font-mono ${VERDICT_COLOR[s.status]}`}
                    >
                      {VERDICT_SHORT[s.status]}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {LANG_LABEL[s.language]}
                    </span>
                    <span className="text-xs text-zinc-600 flex-1">
                      {problems.find((p) => p.id === s.problem_id)?.title ||
                        "Unknown problem"}
                    </span>
                    {s.time_taken && (
                      <span className="text-xs text-zinc-600">
                        {s.time_taken}ms
                      </span>
                    )}
                    {s.status === "accepted" && (
                      <span className="text-xs text-green-400">
                        +{s.score}pt
                      </span>
                    )}
                    <span className="text-xs text-zinc-600">
                      {fmt(s.submitted_at)}
                    </span>
                    <span className="text-xs text-zinc-600 hover:text-white transition">
                      View code →
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Code viewer modal */}
      {selectedCode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded font-mono ${VERDICT_COLOR[selectedCode.status]}`}
                >
                  {VERDICT_SHORT[selectedCode.status]}
                </span>
                <span className="text-sm text-zinc-400">
                  {LANG_LABEL[selectedCode.language]}
                </span>
              </div>
              <button
                onClick={() => setSelectedCode(null)}
                className="text-zinc-500 hover:text-white transition text-xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingCode ? (
                <p className="text-zinc-500 text-sm">Loading...</p>
              ) : (
                <pre className="text-sm text-zinc-200 font-mono whitespace-pre-wrap">
                  {selectedCode.code}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
