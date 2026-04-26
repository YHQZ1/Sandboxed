import type { Problem } from "../../types";

interface Props {
  problems: Problem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const LABELS = "ABCDEFGHIJ";

export default function ProblemList({ problems, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col font-sans w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-2 px-1">
        <span className="text-sm font-medium text-[#737373]">Challenges</span>
        <span className="text-xs font-medium text-[#404040]">
          {problems.length} total
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col">
        {problems.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex items-center gap-4 py-3.5 border-b border-[#262626]/50 last:border-0 transition-colors px-3 -mx-3 rounded-sm text-left
              ${
                selectedId === p.id
                  ? "bg-[#171717] text-[#ededed]"
                  : "text-[#737373] hover:text-[#ededed] hover:bg-[#111111]"
              }`}
          >
            {/* Index Label */}
            <span
              className={`text-xs font-medium w-5 flex-shrink-0 ${
                selectedId === p.id ? "text-[#ededed]" : "text-[#404040]"
              }`}
            >
              {LABELS[i]}
            </span>

            {/* Title */}
            <span
              className={`flex-1 text-sm font-medium truncate ${
                selectedId === p.id ? "text-[#f5f5f5]" : ""
              }`}
            >
              {p.title}
            </span>

            {/* Points */}
            <div className="flex items-baseline gap-1 flex-shrink-0">
              <span
                className={`text-xs font-semibold tabular-nums ${
                  selectedId === p.id ? "text-[#ededed]" : "text-[#525252]"
                }`}
              >
                {p.points}
              </span>
              <span className="text-[10px] font-semibold text-[#404040] uppercase">
                pt
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
