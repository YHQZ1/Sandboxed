import type { Problem } from "../../types";

interface Props {
  problem: Problem;
}

export default function ProblemView({ problem }: Props) {
  return (
    <div className="bg-transparent font-sans selection:bg-[#262626]">
      {/* Meta Specs Row */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { label: "Points", value: `${problem.points}` },
          { label: "Time Limit", value: `${problem.time_limit}s` },
          { label: "Memory", value: `${problem.memory_limit}MB` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-3 py-1 bg-[#171717] border border-[#262626] rounded-sm"
          >
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#737373]">
              {label}
            </span>
            <span className="text-xs font-medium text-[#ededed]">{value}</span>
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="mb-10">
        <p className="text-[14px] text-[#a3a3a3] leading-relaxed whitespace-pre-wrap">
          {problem.description}
        </p>
      </div>

      {/* Sections: Input, Output, Constraints */}
      <div className="space-y-8 mb-10">
        {[
          {
            key: "input_format",
            label: "Input Format",
            value: problem.input_format,
            mono: false,
          },
          {
            key: "output_format",
            label: "Output Format",
            value: problem.output_format,
            mono: false,
          },
          {
            key: "constraints",
            label: "Constraints",
            value: problem.constraints,
            mono: true,
          },
        ]
          .filter((s) => s.value)
          .map((s) => (
            <div key={s.key}>
              <h3 className="text-[11px] font-bold tracking-widest uppercase text-[#737373] mb-3">
                {s.label}
              </h3>
              <p
                className={`text-[13px] text-[#a3a3a3] leading-relaxed ${
                  s.mono
                    ? "font-mono bg-[#111111] p-3 rounded-sm border border-[#262626] text-[#737373]"
                    : ""
                }`}
              >
                {s.value}
              </p>
            </div>
          ))}
      </div>

      {/* Sample Test Cases */}
      {problem.test_cases?.filter((tc) => tc.is_sample).length > 0 && (
        <div className="space-y-8 pt-8 border-t border-[#262626]">
          <h3 className="text-[11px] font-bold tracking-widest uppercase text-[#737373]">
            Examples
          </h3>

          {problem.test_cases
            ?.filter((tc) => tc.is_sample)
            .map((tc, i) => (
              <div key={tc.id} className="space-y-4">
                <div className="text-xs font-medium text-[#525252]">
                  Case {i + 1}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Input", value: tc.input },
                    { label: "Output", value: tc.expected_output },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col">
                      <div className="text-[10px] uppercase font-bold text-[#404040] mb-2 tracking-wide">
                        {label}
                      </div>
                      <pre className="font-mono text-xs bg-[#0a0a0a] border border-[#262626] p-4 text-[#ededed] overflow-x-auto rounded-sm">
                        {value}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
