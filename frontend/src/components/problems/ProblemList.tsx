import type { Problem } from "../../types";

interface Props {
  problems: Problem[];
  selectedId: string | null;
  solvedIds?: Set<string>;
  onSelect: (id: string) => void;
}

const LABELS = "ABCDEFGHIJ";

export default function ProblemList({
  problems,
  selectedId,
  solvedIds,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-1 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#404040]">
          Challenges
        </span>
        <span className="text-xs font-medium text-[#404040]">
          {problems.length} total
        </span>
      </div>

      <div className="flex flex-col">
        {problems.map((p, i) => {
          const isSolved = solvedIds?.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`flex items-center gap-3 py-2.5 border-b border-[#1a1a1a] last:border-0 transition-colors px-2 rounded-sm text-left
                ${selectedId === p.id ? "bg-[#171717] text-[#ededed]" : "text-[#737373] hover:text-[#ededed] hover:bg-[#111111]"}`}
            >
              <span
                className={`text-[11px] font-semibold w-4 flex-shrink-0 ${selectedId === p.id ? "text-[#ededed]" : "text-[#404040]"}`}
              >
                {LABELS[i]}
              </span>

              <span
                className={`flex-1 text-xs font-medium truncate ${selectedId === p.id ? "text-[#f5f5f5]" : ""}`}
              >
                {p.title}
              </span>

              {isSolved && (
                <svg
                  className="w-4 h-4 text-[#8BA888] flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}

              <div className="flex items-baseline gap-0.5 flex-shrink-0">
                <span
                  className={`text-[11px] tabular-nums ${selectedId === p.id ? "text-[#ededed]" : "text-[#525252]"}`}
                >
                  {p.points}
                </span>
                <span className="text-[11px] text-[#404040]">pt</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
