/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
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

  const initialTestCase: TestCaseRow = {
    input: "",
    expected_output: "",
    is_sample: true,
  };
  const [testCases, setTestCases] = useState<TestCaseRow[]>([initialTestCase]);

  const handleAddProblem = async () => {
    if (!title || !description) {
      setError("Title and description are required");
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
      setError(err.response?.data?.error || "Failed to create problem");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTestCases = async () => {
    if (!problemId) return;
    const valid = testCases.filter((tc) => tc.input && tc.expected_output);
    if (valid.length === 0) {
      setError("Add at least one test case with input and expected output");
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
      setError(err.response?.data?.error || "Failed to add test cases");
    } finally {
      setLoading(false);
    }
  };

  const addTestCaseRow = () => {
    const newRow: TestCaseRow = {
      input: "",
      expected_output: "",
      is_sample: false,
    };
    setTestCases((prev) => [...prev, newRow]);
  };

  const updateTestCase = (
    i: number,
    field: keyof TestCaseRow,
    value: string | boolean,
  ) => {
    setTestCases((prev) =>
      prev.map((tc, idx) => (idx === i ? { ...tc, [field]: value } : tc)),
    );
  };

  const removeTestCase = (i: number) => {
    setTestCases((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg">
              {step === "problem" ? "Add Problem" : "Add Test Cases"}
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              {step === "problem" ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition text-xl leading-none"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          {step === "problem" ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">
                  Title *
                </label>
                <input
                  className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-white/20 text-sm"
                  placeholder="e.g. Two Sum"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">
                  Description *
                </label>
                <textarea
                  className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-white/20 text-sm resize-none"
                  placeholder="Problem statement..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">
                    Input Format
                  </label>
                  <textarea
                    className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-white/20 text-sm resize-none"
                    rows={2}
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">
                    Output Format
                  </label>
                  <textarea
                    className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-white/20 text-sm resize-none"
                    rows={2}
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">
                  Constraints
                </label>
                <input
                  className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-white/20 text-sm"
                  placeholder="e.g. 1 <= N <= 10^5"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">
                    Points
                  </label>
                  <input
                    type="number"
                    className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-white/20 text-sm"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">
                    Time Limit (s)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-white/20 text-sm"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1 block">
                    Memory (MB)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-zinc-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-white/20 text-sm"
                    value={memoryLimit}
                    onChange={(e) => setMemoryLimit(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-zinc-400 text-sm">
                Add test cases. Sample ones are visible to participants, hidden
                ones are only used for judging.
              </p>
              {testCases.map((tc, i) => (
                <div
                  key={i}
                  className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">
                      Test Case {i + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.is_sample}
                          onChange={(e) =>
                            updateTestCase(i, "is_sample", e.target.checked)
                          }
                          className="accent-white"
                        />
                        <span className="text-xs text-zinc-400">
                          Sample (visible)
                        </span>
                      </label>
                      {testCases.length > 1 && (
                        <button
                          onClick={() => removeTestCase(i)}
                          className="text-zinc-600 hover:text-red-400 transition text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-500 text-xs mb-1 block">
                        Input
                      </label>
                      <textarea
                        className="w-full bg-zinc-700 rounded-lg px-3 py-2 outline-none text-sm font-mono resize-none focus:ring-2 focus:ring-white/20"
                        rows={3}
                        placeholder="stdin input"
                        value={tc.input}
                        onChange={(e) =>
                          updateTestCase(i, "input", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-zinc-500 text-xs mb-1 block">
                        Expected Output
                      </label>
                      <textarea
                        className="w-full bg-zinc-700 rounded-lg px-3 py-2 outline-none text-sm font-mono resize-none focus:ring-2 focus:ring-white/20"
                        rows={3}
                        placeholder="expected stdout"
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
                className="w-full py-2 border border-dashed border-zinc-700 rounded-xl text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition text-sm"
              >
                + Add another test case
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition text-sm"
          >
            Cancel
          </button>
          {step === "problem" ? (
            <button
              onClick={handleAddProblem}
              disabled={loading}
              className="px-6 py-2 bg-white text-black font-semibold text-sm rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Next"}
            </button>
          ) : (
            <button
              onClick={handleAddTestCases}
              disabled={loading}
              className="px-6 py-2 bg-white text-black font-semibold text-sm rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Problem"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
