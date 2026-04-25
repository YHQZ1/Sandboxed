import { useLeaderboardStore } from "../../store/leaderboardStore";

export default function Leaderboard() {
  const { leaderboard } = useLeaderboardStore();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="font-semibold text-sm text-zinc-300">Leaderboard</h2>
      </div>
      {leaderboard.length === 0 ? (
        <p className="text-zinc-600 text-sm px-4 py-6 text-center">
          No submissions yet
        </p>
      ) : (
        <div className="divide-y divide-zinc-800">
          {leaderboard.map((entry, i) => (
            <div key={entry.name} className="px-4 py-3 flex items-center gap-3">
              <span className="text-zinc-500 text-sm w-5">{i + 1}</span>
              <span className="flex-1 font-medium text-sm">{entry.name}</span>
              <span className="text-zinc-400 text-xs">
                {entry.solvedCount} solved
              </span>
              <span className="font-mono font-bold text-sm">
                {entry.score}pt
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
