import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import type { SubmissionStatus } from "../../types";

interface FeedItem {
  id: string;
  participantName: string;
  problemTitle: string;
  status: SubmissionStatus;
  score: number;
  timestamp: Date;
}

interface SubmissionUpdateData {
  submissionId: string;
  participantName: string;
  problemTitle: string;
  status: SubmissionStatus;
  score: number;
}

interface Props {
  socket: Socket;
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
  judging: "...",
  queued: "QU",
};

export default function LiveFeed({ socket }: Props) {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    const handleUpdate = (data: SubmissionUpdateData) => {
      setFeed((prev) => [
        {
          id: data.submissionId,
          participantName: data.participantName,
          problemTitle: data.problemTitle,
          status: data.status,
          score: data.score,
          timestamp: new Date(),
        },
        ...prev.slice(0, 49),
      ]);
    };

    socket.on("submission_update", handleUpdate);
    return () => {
      socket.off("submission_update", handleUpdate);
    };
  }, [socket]);

  const fmt = (d: Date) =>
    d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-2 px-1">
        <span className="text-sm font-medium text-[#737373] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ededed] animate-pulse" />
          Live Activity
        </span>
        <span className="text-xs font-medium text-[#404040]">
          {feed.length} events
        </span>
      </div>

      {feed.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#404040]">Waiting for submissions...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {feed.map((item) => (
            <div
              key={item.id + item.timestamp.getTime()}
              className="flex items-center gap-4 py-3 border-b border-[#262626]/50 last:border-0 hover:bg-[#111111] transition-colors px-3 -mx-3 rounded-sm"
            >
              <span
                className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-sm flex-shrink-0 min-w-[45px] text-center ${VERDICT_STYLE[item.status]}`}
              >
                {VERDICT_SHORT[item.status]}
              </span>

              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-sm font-medium text-[#f5f5f5] truncate">
                  {item.participantName}
                </span>
                <span className="hidden sm:inline text-[#404040]">
                  &middot;
                </span>
                <span className="text-sm text-[#737373] truncate">
                  {item.problemTitle}
                </span>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                {item.status === "accepted" && (
                  <span className="text-xs font-medium text-[#ededed]">
                    +{item.score}pt
                  </span>
                )}
                <span className="text-xs text-[#404040] tabular-nums">
                  {fmt(item.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
