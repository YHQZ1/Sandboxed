/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
}

interface Problem {
  id: string;
  title: string;
  points: number;
  order_index: number;
}

const VERDICT_STYLE: Record<SubmissionStatus, string> = {
  accepted: "text-[#8BA888] border-[#8BA888]/20 bg-[#8BA888]/5",
  wrong_answer: "text-[#C27373] border-[#C27373]/20 bg-[#C27373]/5",
  tle: "text-[#737373] border-[#262626] bg-transparent",
  runtime_error: "text-[#C27373] border-[#C27373]/20 bg-[#C27373]/5",
  compilation_error: "text-[#C27373] border-[#C27373]/20 bg-[#C27373]/5",
  queued: "text-[#404040] border-[#262626] bg-transparent",
  judging: "text-[#a3a3a3] border-[#262626] bg-transparent animate-pulse",
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

const VERDICT_LABEL: Record<SubmissionStatus, string> = {
  accepted: "ACCEPTED",
  wrong_answer: "WRONG ANSWER",
  tle: "TIME LIMIT EXCEEDED",
  runtime_error: "RUNTIME ERROR",
  compilation_error: "COMPILATION ERROR",
  queued: "QUEUED",
  judging: "JUDGING...",
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
  const [searchParams] = useSearchParams();

  const participantName = searchParams.get("name") || "";
  const isHost = !participantName;

  const [problems, setProblems] = useState<Problem[]>([]);
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const [myStats, setMyStats] = useState<ParticipantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(
    null,
  );
  const [selectedCode, setSelectedCode] = useState<{
    code: string;
    language: Language;
    status: SubmissionStatus;
  } | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [problemsRes, submissionsRes] = await Promise.all([
        api.get(`/rooms/${code}/problems`),
        isHost
          ? api.get(`/rooms/${code}/submissions`)
          : api.get(`/rooms/${code}/submissions/${participantName}`),
      ]);

      const problemsData: Problem[] = problemsRes.data.problems || [];
      setProblems(problemsData.sort((a, b) => a.order_index - b.order_index));

      if (isHost) {
        const allSubmissions: SubmissionRecord[] =
          submissionsRes.data.submissions || [];
        const map = new Map<string, ParticipantSummary>();

        const solvedProblems = new Set<string>();

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

          const solvedKey = `${s.participant_name}:${s.problem_id}`;
          if (s.status === "accepted" && !solvedProblems.has(solvedKey)) {
            solvedProblems.add(solvedKey);
            map.get(s.participant_name)!.score += s.score;
            map.get(s.participant_name)!.solvedCount += 1;
          }
        }

        const sorted = Array.from(map.values()).sort(
          (a, b) => b.score - a.score,
        );

        sorted.forEach((p) => {
          p.submissions.sort(
            (a, b) =>
              new Date(b.submitted_at).getTime() -
              new Date(a.submitted_at).getTime(),
          );
        });

        setParticipants(sorted);
        if (sorted.length > 0) setSelectedParticipant(sorted[0].name);
      } else {
        const mySubmissions: SubmissionRecord[] =
          submissionsRes.data.submissions || [];
        const solvedProblems = new Set<string>();
        let totalScore = 0;
        let solvedCount = 0;

        for (const s of mySubmissions) {
          if (s.status === "accepted" && !solvedProblems.has(s.problem_id)) {
            solvedProblems.add(s.problem_id);
            totalScore += s.score;
            solvedCount += 1;
          }
        }

        const stats: ParticipantSummary = {
          name: participantName,
          score: totalScore,
          solvedCount,
          submissions: mySubmissions,
        };
        setMyStats(stats);

        const leaderboardRes = await api.get(`/rooms/${code}/leaderboard`);
        const leaderboardData = leaderboardRes.data.leaderboard || [];
        setParticipants(
          leaderboardData.map((entry: any) => ({
            name: entry.name,
            score: entry.score,
            solvedCount: entry.solvedCount,
            submissions: [],
          })),
        );
      }
    } catch (err) {
      console.error("PostContest fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [code, isHost, participantName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewCode = async (submissionId: string) => {
    setLoadingCode(true);
    try {
      const res = await api.get(`/submissions/${submissionId}`);
      const s = res.data.submission;
      setSelectedCode({ code: s.code, language: s.language, status: s.status });
    } catch {
      setSelectedCode({
        code: "Unable to load source code.",
        language: "python",
        status: "runtime_error",
      });
    } finally {
      setLoadingCode(false);
    }
  };

  const selectedSummary = isHost
    ? participants.find((p) => p.name === selectedParticipant)
    : myStats;

  const getBestSubmission = (participantName: string, problemId: string) => {
    const p = participants.find((p) => p.name === participantName);
    if (!p) return null;
    const subs = p.submissions.filter((s) => s.problem_id === problemId);
    return subs.find((s) => s.status === "accepted") || subs[0] || null;
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-[#262626] border-t-[#ededed] rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#737373]">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] selection:bg-[#262626]">
      <header className="border-b border-[#262626] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-sm z-30">
        <div className="flex items-center gap-4">
          <span className="text-lg font-medium tracking-tight text-[#f5f5f5]">
            Dojo.
          </span>
          <div className="h-4 w-px bg-[#262626]" />
          <span className="text-xs font-medium text-[#737373] uppercase tracking-wide">
            {code} / {isHost ? "Archives" : "Results"}
          </span>
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-sm font-medium text-[#737373] hover:text-[#ededed] transition-colors"
        >
          Back to Home
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12">
        {participants.length === 0 && !myStats ? (
          <div className="text-center py-20">
            <p className="text-lg text-[#404040] mb-2">No results yet</p>
            <p className="text-sm text-[#404040]">
              Submissions will appear here after the contest ends.
            </p>
          </div>
        ) : (
          <>
            {!isHost && myStats && (
              <section className="bg-[#0a0a0a] border border-[#262626] rounded-sm p-8">
                <span className="text-[10px] font-bold text-[#404040] uppercase tracking-[0.2em] mb-6 block">
                  Your Result
                </span>
                <div className="flex items-center gap-8 flex-wrap">
                  <div>
                    <p className="text-[10px] text-[#737373] uppercase tracking-widest mb-1">
                      Name
                    </p>
                    <p className="text-xl font-medium">{myStats.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#737373] uppercase tracking-widest mb-1">
                      Score
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-medium tabular-nums">
                        {myStats.score}
                      </span>
                      <span className="text-[10px] font-bold text-[#404040]">
                        PT
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#737373] uppercase tracking-widest mb-1">
                      Solved
                    </p>
                    <p className="text-2xl font-medium tabular-nums">
                      {myStats.solvedCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#737373] uppercase tracking-widest mb-1">
                      Attempts
                    </p>
                    <p className="text-2xl font-medium tabular-nums">
                      {myStats.submissions.length}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {isHost && (
              <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {participants.slice(0, 3).map((p, i) => (
                  <div
                    key={p.name}
                    className="bg-[#0a0a0a] border border-[#262626] p-6 rounded-sm relative overflow-hidden cursor-pointer hover:bg-[#0d0d0d] transition-colors"
                    onClick={() => setSelectedParticipant(p.name)}
                  >
                    <div className="absolute top-0 right-0 p-4 text-4xl font-bold text-[#141414] leading-none select-none">
                      {i + 1}
                    </div>
                    <span className="text-[10px] font-bold text-[#404040] uppercase tracking-[0.2em] mb-4 block">
                      Ranked Participant
                    </span>
                    <h3 className="text-lg font-medium mb-1">{p.name}</h3>
                    <p className="text-[10px] text-[#737373] uppercase tracking-widest mb-6">
                      {p.solvedCount} Solved / {p.submissions.length} Tries
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-medium tabular-nums">
                        {p.score}
                      </span>
                      <span className="text-[10px] font-bold text-[#404040]">
                        PT
                      </span>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {isHost && (
              <section className="bg-[#0a0a0a] border border-[#262626] rounded-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#262626]">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040]">
                    Results Matrix
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#262626]">
                        <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#404040] tracking-widest">
                          Participant
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#404040] tracking-widest text-center">
                          Final Score
                        </th>
                        {problems.map((p, i) => (
                          <th
                            key={p.id}
                            className="px-4 py-3 text-[10px] font-bold uppercase text-[#404040] tracking-widest text-center"
                          >
                            {String.fromCharCode(65 + i)}
                            <span className="block text-[8px] opacity-40 font-normal">
                              {p.points}P
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626]/50">
                      {participants.map((participant, idx) => (
                        <tr
                          key={participant.name}
                          onClick={() =>
                            setSelectedParticipant(participant.name)
                          }
                          className={`transition-colors cursor-pointer ${
                            selectedParticipant === participant.name
                              ? "bg-[#111]"
                              : "hover:bg-[#0d0d0d]"
                          }`}
                        >
                          <td className="px-4 py-3 flex items-center gap-3">
                            <span className="text-[10px] font-bold text-[#404040]">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <span className="text-sm font-medium">
                              {participant.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold tabular-nums text-sm">
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
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${VERDICT_STYLE[best.status]}`}
                                  >
                                    {VERDICT_SHORT[best.status]}
                                  </span>
                                ) : (
                                  <span className="text-[#262626]">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040]">
                  {isHost
                    ? `Submissions / ${selectedParticipant || "—"}`
                    : "Your Submissions"}
                </span>
                <div className="bg-[#0a0a0a] border border-[#262626] divide-y divide-[#262626] max-h-[500px] overflow-y-auto">
                  {(selectedSummary?.submissions.length ?? 0) === 0 ? (
                    <div className="p-8 text-center text-sm text-[#404040]">
                      No submissions
                    </div>
                  ) : (
                    selectedSummary?.submissions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          isHost ? handleViewCode(s.id) : undefined
                        }
                        className={`w-full flex items-center gap-4 px-4 py-3 transition-colors text-left ${isHost ? "hover:bg-[#111] cursor-pointer" : "cursor-default"}`}
                      >
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border w-10 text-center flex-shrink-0 ${VERDICT_STYLE[s.status]}`}
                        >
                          {VERDICT_SHORT[s.status]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#ededed] truncate">
                            {problems.find((p) => p.id === s.problem_id)
                              ?.title || "Unknown Problem"}
                          </div>
                          <div className="text-[9px] text-[#404040] uppercase font-bold mt-0.5">
                            {LANG_LABEL[s.language]} · {s.time_taken || 0}ms
                          </div>
                        </div>
                        <span className="text-[10px] font-medium tabular-nums text-[#404040] flex-shrink-0">
                          {fmt(s.submitted_at)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {isHost && (
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040]">
                    Source Review
                  </span>
                  {selectedCode ? (
                    <div className="bg-[#0a0a0a] border border-[#262626] p-6 min-h-[400px] max-h-[500px] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`text-[10px] font-bold tracking-widest border px-2 py-0.5 rounded-sm ${VERDICT_STYLE[selectedCode.status]}`}
                        >
                          {VERDICT_LABEL[selectedCode.status]}
                        </span>
                        <span className="text-[10px] font-bold text-[#737373] uppercase">
                          {LANG_LABEL[selectedCode.language]}
                        </span>
                      </div>
                      {loadingCode ? (
                        <div className="flex items-center justify-center py-20">
                          <div className="w-6 h-6 border-2 border-[#262626] border-t-[#ededed] rounded-full animate-spin" />
                        </div>
                      ) : (
                        <pre className="text-xs font-mono text-[#a3a3a3] leading-relaxed whitespace-pre-wrap">
                          {selectedCode.code}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 border border-dashed border-[#262626] rounded-sm text-sm text-[#404040]">
                      Select a submission to view source code
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
