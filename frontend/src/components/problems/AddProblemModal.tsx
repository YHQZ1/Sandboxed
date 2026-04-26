/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import api from "../../lib/api";
import { getSocket } from "../../socket/socket";
import type { Problem } from "../../types";

interface TestCaseRow {
  input: string;
  expected_output: string;
  is_sample: boolean;
}

interface Props {
  roomCode: string;
  onClose: () => void;
  onAdded: (problem: Problem) => void;
}

export default function AddProblemModal({ roomCode, onClose, onAdded }: Props) {
  const [step, setStep] = useState<"problem" | "testcases">("problem");
  const [problemId, setProblemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [constraints, setConstraints] = useState("");
  const [points, setPoints] = useState(100);
  const [timeLimit, setTimeLimit] = useState(2);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [testCases, setTestCases] = useState<TestCaseRow[]>([
    { input: "", expected_output: "", is_sample: true },
  ]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleAddProblem = async () => {
    if (!title || !description) {
      setError("Title and description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/rooms/${roomCode}/problems`, {
        title,
        description,
        input_format: inputFormat,
        output_format: outputFormat,
        constraints,
        points,
        time_limit: timeLimit,
        memory_limit: memoryLimit,
      });
      const problem: Problem = res.data.problem;
      setProblemId(problem.id);
      onAdded(problem);
      getSocket().emit("problem_added", { roomCode, problem });
      setStep("testcases");
    } catch (err: unknown) {
      setError(
        err instanceof Error && "response" in err
          ? (err.response as any)?.data?.error || "Failed to create problem."
          : "Failed to create problem.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddTestCases = async () => {
    if (!problemId) return;
    const valid = testCases.filter((tc) => tc.input && tc.expected_output);
    if (valid.length === 0) {
      setError("Add at least one test case with input and output.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      for (const tc of valid) {
        await api.post(
          `/rooms/${roomCode}/problems/${problemId}/testcases`,
          tc,
        );
      }
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error && "response" in err
          ? (err.response as any)?.data?.error || "Failed to add test cases."
          : "Failed to add test cases.",
      );
    } finally {
      setLoading(false);
    }
  };

  const addTestCaseRow = () =>
    setTestCases((prev) => [
      ...prev,
      { input: "", expected_output: "", is_sample: false },
    ]);

  const updateTestCase = (
    i: number,
    field: keyof TestCaseRow,
    value: string | boolean,
  ) =>
    setTestCases((prev) =>
      prev.map((tc, idx) => (idx === i ? { ...tc, [field]: value } : tc)),
    );

  const removeTestCase = (i: number) =>
    setTestCases((prev) => prev.filter((_, idx) => idx !== i));

  const inputClass =
    "w-full bg-transparent border border-[#262626] rounded-sm px-3 py-2 text-[#ededed] placeholder-[#404040] outline-none focus:border-[#737373] transition-colors text-sm";
  const labelClass = "text-xs font-medium text-[#737373] mb-1.5 block";

  return (
    <div className="fixed inset-0 bg-[#0a0a0a]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#262626] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] flex-shrink-0">
          <h2 className="text-lg font-medium text-[#f5f5f5]">
            {step === "problem" ? "New Problem" : "Test Cases"}
          </h2>
          <button
            onClick={onClose}
            className="text-xs font-medium text-[#737373] hover:text-[#ededed] transition-colors"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 p-3 rounded-sm">
              <p className="text-xs text-[#ef4444] font-medium">{error}</p>
            </div>
          )}

          {step === "problem" ? (
            <>
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  placeholder="Problem title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={inputClass}
                  placeholder="Problem statement..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Input Format</label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Output Format</label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Constraints</label>
                <input
                  className={inputClass}
                  placeholder="e.g. 1 <= N <= 10^5"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Points", v: points, set: setPoints },
                  { label: "Time Limit (s)", v: timeLimit, set: setTimeLimit },
                  {
                    label: "Memory Limit (MB)",
                    v: memoryLimit,
                    set: setMemoryLimit,
                  },
                ].map(({ label, v, set }) => (
                  <div key={label}>
                    <label className={labelClass}>{label}</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={v}
                      onChange={(e) => set(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-[#737373]">
                Sample test cases are visible to participants. Hidden cases are
                for final judging.
              </p>
              {testCases.map((tc, i) => (
                <div
                  key={i}
                  className="border border-[#262626] p-4 rounded-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#404040] uppercase">
                      Case {i + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-[11px] text-[#737373] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.is_sample}
                          onChange={(e) =>
                            updateTestCase(i, "is_sample", e.target.checked)
                          }
                          className="w-3 h-3 rounded-sm border-[#262626] bg-transparent accent-[#ededed]"
                        />
                        Sample
                      </label>
                      {testCases.length > 1 && (
                        <button
                          onClick={() => removeTestCase(i)}
                          className="text-[10px] font-bold text-[#ef4444] hover:text-[#f87171] uppercase"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Input</label>
                      <textarea
                        className={inputClass}
                        rows={3}
                        value={tc.input}
                        onChange={(e) =>
                          updateTestCase(i, "input", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Expected Output</label>
                      <textarea
                        className={inputClass}
                        rows={3}
                        value={tc.expected_output}
                        onChange={(e) =>
                          updateTestCase(i, "expected_output", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addTestCaseRow}
                className="w-full py-3 border border-dashed border-[#262626] text-xs font-bold uppercase text-[#737373] hover:border-[#404040] hover:text-[#ededed] transition-colors rounded-sm"
              >
                Add Test Case
              </button>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#262626] flex-shrink-0">
          <button
            onClick={onClose}
            className="text-xs font-medium text-[#737373] hover:text-[#ededed] px-4 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={step === "problem" ? handleAddProblem : handleAddTestCases}
            disabled={loading}
            className="px-6 py-2 text-xs font-bold uppercase bg-[#ededed] text-[#0a0a0a] rounded-sm hover:bg-[#d4d4d4] transition-colors disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : step === "problem"
                ? "Save Problem"
                : "Save Test Cases"}
          </button>
        </div>
      </div>
    </div>
  );
}
