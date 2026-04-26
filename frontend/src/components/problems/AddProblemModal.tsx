/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import api from "../../lib/api";
import { getSocket } from "../../socket/socket";

interface TestCaseRow {
  input: string;
  expected_output: string;
  is_sample: boolean;
}

interface Props {
  roomCode: string;
  onClose: () => void;
  onAdded: (problem: any) => void;
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

  // Handle Escape key to close modal
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
      setProblemId(res.data.problem.id);
      onAdded(res.data.problem);
      getSocket().emit("problem_added", {
        roomCode,
        problem: res.data.problem,
      });
      setStep("testcases");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create problem.");
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
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add test cases.");
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
    "w-full bg-transparent border border-[#262626] rounded-sm px-3 py-2 text-[#ededed] placeholder-[#404040] outline-none focus:border-[#737373] transition-colors text-sm resize-none";
  const labelClass = "text-xs font-medium text-[#737373] mb-1.5 block";

  return (
    <div className="fixed inset-0 bg-[#0a0a0a]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#262626] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-sm shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] flex-shrink-0">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#404040]">
              {step === "problem" ? "Phase 01 — Details" : "Phase 02 — Data"}
            </span>
            <h2 className="text-lg font-medium text-[#f5f5f5]">
              {step === "problem" ? "Create Challenge" : "Define Test Cases"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-medium text-[#737373] hover:text-[#ededed] transition-colors"
          >
            Close
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 p-3 rounded-sm">
              <p className="text-xs text-[#ef4444] font-medium">{error}</p>
            </div>
          )}

          {step === "problem" ? (
            <>
              <div>
                <label className={labelClass}>Challenge Title</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Tree Traversal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={inputClass}
                  placeholder="The problem core statement..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Input Specification</label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Output Specification</label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>System Constraints</label>
                <input
                  className={inputClass}
                  placeholder="e.g. N <= 10^5"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Points", v: points, set: setPoints },
                  { label: "Time (s)", v: timeLimit, set: setTimeLimit },
                  { label: "Memory (MB)", v: memoryLimit, set: setMemoryLimit },
                ].map(({ label, v, set }) => (
                  <div key={label}>
                    <label className={labelClass}>{label}</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={v}
                      onChange={(e) => set(parseInt(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-[#737373] mb-2">
                Sample cases are visible to all users. Hidden cases are for
                final judging only.
              </p>
              {testCases.map((tc, i) => (
                <div
                  key={i}
                  className="border border-[#262626] p-4 rounded-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#404040] uppercase">
                      CASE {i + 1}
                    </span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.is_sample}
                          onChange={(e) =>
                            updateTestCase(i, "is_sample", e.target.checked)
                          }
                          className="w-3 h-3 accent-[#ededed]"
                        />
                        <span className="text-[11px] text-[#737373]">
                          Visible Sample
                        </span>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Input (stdin)</label>
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
                      <label className={labelClass}>Expected (stdout)</label>
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
                className="w-full py-3 border border-dashed border-[#262626] text-[11px] font-bold uppercase text-[#737373] hover:border-[#404040] hover:text-[#ededed] transition-colors rounded-sm"
              >
                + Append New Case
              </button>
            </>
          )}
        </div>

        {/* Footer Actions */}
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
                ? "Continue →"
                : "Finalize Problem"}
          </button>
        </div>
      </div>
    </div>
  );
}
