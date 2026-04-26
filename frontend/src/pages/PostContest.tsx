/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
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

  const [problems, setProblems] = useState<Problem[]>([]);
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
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
      const [roomRes, submissionsRes] = await Promise.all([
        api.get(`/rooms/${code}`),
        api.get(`/rooms/${code}/submissions`),
      ]);

      const problemsData: Problem[] = roomRes.data.problems || [];
      setProblems(problemsData.sort((a, b) => a.order_index - b.order_index));

      const allSubmissions: SubmissionRecord[] =
        submissionsRes.data.submissions || [];
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

      const sorted = Array.from(map.values()).sort((a, b) => b.score - a.score);
      setParticipants(sorted);
      if (sorted.length > 0) setSelectedParticipant(sorted[0].name);
    } catch {
      console.error("Failed to load contest data");
    } finally {
      setLoading(false);
    }
  }, [code]);

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
        code: "Internal storage error",
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
    return (
      subs.find((s) => s.status === "accepted") || subs[subs.length - 1] || null
    );
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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#404040] animate-pulse">
          Analysing_Results
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] font-sans selection:bg-[#262626]">
      <header className="border-b border-[#141414] px-8 py-4 flex items-center justify-between bg-[#050505]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <span className="text-lg font-medium tracking-tighter text-[#f5f5f5]">
            Dojo.
          </span>
          <div className="h-4 w-px bg-[#1a1a1a]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#404040]">
            {code} / Archives
          </span>
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-[10px] font-bold uppercase tracking-widest text-[#737373] hover:text-[#ededed] transition-colors"
        >
          Exit_To_Home
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12 space-y-12">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {participants.slice(0, 3).map((p, i) => (
            <div
              key={p.name}
              className="bg-[#0a0a0a] border border-[#141414] p-8 rounded-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 text-[40px] font-bold text-[#141414] leading-none select-none group-hover:text-[#1a1a1a] transition-colors">
                0{i + 1}
              </div>
              <span className="text-[10px] font-bold text-[#404040] uppercase tracking-[0.2em] mb-4 block">
                Ranked_Participant
              </span>
              <h3 className="text-xl font-medium mb-1">{p.name}</h3>
              <p className="text-[10px] text-[#737373] uppercase tracking-widest mb-6">
                {p.solvedCount} Solved / {p.submissions.length} Tries
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-medium tabular-nums">
                  {p.score}
                </span>
                <span className="text-[10px] font-bold text-[#404040]">
                  PTS
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="bg-[#0a0a0a] border border-[#141414] rounded-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#141414] bg-[#050505]">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040]">
              Execution_Matrix
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#141414]">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-[#404040] tracking-widest">
                    Participant
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-[#404040] tracking-widest text-center">
                    Final_Score
                  </th>
                  {problems.map((p, i) => (
                    <th
                      key={p.id}
                      className="px-6 py-4 text-[10px] font-bold uppercase text-[#404040] tracking-widest text-center"
                    >
                      {String.fromCharCode(65 + i)}
                      <span className="block text-[8px] opacity-40 font-normal">
                        {p.points}P
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]/50">
                {participants.map((participant, idx) => (
                  <tr
                    key={participant.name}
                    onClick={() => setSelectedParticipant(participant.name)}
                    className={`transition-colors cursor-pointer ${selectedParticipant === participant.name ? "bg-[#111]" : "hover:bg-[#080808]"}`}
                  >
                    <td className="px-6 py-4 flex items-center gap-4">
                      <span className="text-[10px] font-bold text-[#222]">
                        {(idx + 1).toString().padStart(2, "0")}
                      </span>
                      <span className="text-sm font-medium">
                        {participant.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold tabular-nums text-sm">
                      {participant.score}
                    </td>
                    {problems.map((problem) => {
                      const best = getBestSubmission(
                        participant.name,
                        problem.id,
                      );
                      return (
                        <td key={problem.id} className="px-6 py-4 text-center">
                          {best ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${VERDICT_STYLE[best.status]}`}
                            >
                              {VERDICT_SHORT[best.status]}
                            </span>
                          ) : (
                            <span className="text-[#1a1a1a]">--</span>
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

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040]">
                Audit_Logs / {selectedParticipant}
              </span>
            </div>
            <div className="bg-[#0a0a0a] border border-[#141414] divide-y divide-[#141414]">
              {selectedSummary?.submissions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleViewCode(s.id)}
                  className="w-full flex items-center gap-6 px-6 py-4 hover:bg-[#111] transition-colors group border-none bg-transparent"
                >
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border w-10 text-center ${VERDICT_STYLE[s.status]}`}
                  >
                    {VERDICT_SHORT[s.status]}
                  </span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-[#ededed] group-hover:text-white">
                      {problems.find((p) => p.id === s.problem_id)?.title}
                    </div>
                    <div className="text-[9px] text-[#404040] uppercase font-bold mt-0.5">
                      {LANG_LABEL[s.language]} • {s.time_taken || 0}ms
                    </div>
                  </div>
                  <span className="text-[10px] font-medium tabular-nums text-[#404040]">
                    {fmt(s.submitted_at)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedCode ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#404040]">
                  Source_Review
                </span>
                <span className="text-[10px] font-bold text-[#737373] uppercase">
                  {LANG_LABEL[selectedCode.language]}
                </span>
              </div>
              <div className="bg-[#0a0a0a] border border-[#141414] p-8 min-h-[400px] relative overflow-hidden">
                <div
                  className={`absolute top-0 right-0 p-4 text-[10px] font-bold tracking-widest ${VERDICT_STYLE[selectedCode.status]}`}
                >
                  {VERDICT_LABEL[selectedCode.status]}
                </div>
                {loadingCode ? (
                  <div className="h-full flex items-center justify-center text-[10px] text-[#222] animate-pulse">
                    DECRYPTING...
                  </div>
                ) : (
                  <pre className="text-xs font-mono text-[#a3a3a3] leading-relaxed whitespace-pre-wrap">
                    {selectedCode.code}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center border border-dashed border-[#1a1a1a] rounded-sm text-[10px] text-[#222] uppercase tracking-widest">
              Select_A_Log_To_View_Source
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
