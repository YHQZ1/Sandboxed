import type { Problem } from "../../types";

interface Props {
  problem: Problem;
}

export default function ProblemView({ problem }: Props) {
  return (
    <div className="prose prose-invert max-w-none text-sm">
      <h2 className="text-xl font-bold text-white mb-1">{problem.title}</h2>
      <div className="flex gap-4 text-xs text-zinc-500 mb-4">
        <span>{problem.points} points</span>
        <span>Time: {problem.time_limit}s</span>
        <span>Memory: {problem.memory_limit}MB</span>
      </div>
      <p className="text-zinc-300 whitespace-pre-wrap mb-4">
        {problem.description}
      </p>
      {problem.input_format && (
        <div className="mb-3">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">
            Input Format
          </h3>
          <p className="text-zinc-300">{problem.input_format}</p>
        </div>
      )}
      {problem.output_format && (
        <div className="mb-3">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">
            Output Format
          </h3>
          <p className="text-zinc-300">{problem.output_format}</p>
        </div>
      )}
      {problem.constraints && (
        <div className="mb-4">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">
            Constraints
          </h3>
          <p className="text-zinc-300 font-mono text-xs">
            {problem.constraints}
          </p>
        </div>
      )}
      {problem.test_cases
        ?.filter((tc) => tc.is_sample)
        .map((tc, i) => (
          <div key={tc.id} className="mb-3">
            <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Sample {i + 1}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-zinc-500 text-xs mb-1">Input</p>
                <pre className="bg-zinc-800 rounded p-2 text-xs text-zinc-200 overflow-auto">
                  {tc.input}
                </pre>
              </div>
              <div>
                <p className="text-zinc-500 text-xs mb-1">Output</p>
                <pre className="bg-zinc-800 rounded p-2 text-xs text-zinc-200 overflow-auto">
                  {tc.expected_output}
                </pre>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
