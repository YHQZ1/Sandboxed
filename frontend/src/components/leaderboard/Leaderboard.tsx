import { useLeaderboardStore } from "../../store/leaderboardStore";

export default function Leaderboard() {
  const { leaderboard } = useLeaderboardStore();

  return (
    <div className="flex flex-col font-sans w-full selection:bg-[#262626]">
      {/* Header Section */}
      <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-2 px-1">
        <span className="text-sm font-medium text-[#737373]">
          Live standings
        </span>
        <span className="text-xs font-medium text-[#404040]">
          {leaderboard.length} participants
        </span>
      </div>

      {leaderboard.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-[#404040]">No submissions recorded yet.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {leaderboard.map((entry, i) => (
            <div
              key={entry.name}
              className={`flex items-center gap-4 py-3.5 border-b border-[#262626]/50 last:border-0 hover:bg-[#111111] transition-colors px-3 -mx-3 rounded-sm ${
                i === 0 ? "bg-[#171717]/30" : ""
              }`}
            >
              {/* Rank */}
              <span
                className={`text-xs font-medium w-5 flex-shrink-0 tabular-nums ${
                  i === 0 ? "text-[#ededed]" : "text-[#404040]"
                }`}
              >
                {i + 1}
              </span>

              {/* Name */}
              <span
                className={`flex-1 text-sm font-medium truncate ${
                  i === 0 ? "text-[#f5f5f5]" : "text-[#a3a3a3]"
                }`}
              >
                {entry.name}
              </span>

              {/* Stats: Solved */}
              <span className="text-xs text-[#525252] flex items-center gap-1.5">
                <span className={i === 0 ? "text-[#a3a3a3]" : ""}>
                  {entry.solvedCount}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">
                  solved
                </span>
              </span>

              {/* Stats: Score */}
              <div className="flex items-baseline gap-1 min-w-[60px] justify-end">
                <span
                  className={`text-sm font-bold tabular-nums ${
                    i === 0 ? "text-[#ededed]" : "text-[#737373]"
                  }`}
                >
                  {entry.score}
                </span>
                <span className="text-[10px] font-semibold text-[#404040] uppercase">
                  pt
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
