import type { Problem } from "../../types";

interface Props {
  problems: Problem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ProblemList({ problems, selectedId, onSelect }: Props) {
  const labels = "ABCDEFGHIJ";
  return (
    <div className="flex flex-col gap-1">
      {problems.map((p, i) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`text-left px-3 py-2 rounded-lg text-sm transition ${
            selectedId === p.id
              ? "bg-white text-black font-semibold"
              : "text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          <span className="font-mono mr-2">{labels[i]}.</span>
          {p.title}
          <span className="ml-auto float-right text-xs opacity-50">
            {p.points}pt
          </span>
        </button>
      ))}
    </div>
  );
}
