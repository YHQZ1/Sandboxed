import { useTimerStore } from "../../store/timerStore";

const fmt = (s: number) => {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export default function Timer() {
  const { timeRemaining, status } = useTimerStore();

  const color =
    status === "ended"
      ? "text-red-400"
      : status === "paused"
        ? "text-yellow-400"
        : timeRemaining < 300
          ? "text-red-400"
          : "text-white";

  return (
    <div className={`font-mono text-2xl font-bold tabular-nums ${color}`}>
      {status === "waiting" && (
        <span className="text-zinc-500 text-sm font-normal">Not started</span>
      )}
      {status === "ended" && (
        <span className="text-red-400">Contest Ended</span>
      )}
      {(status === "active" || status === "paused") && (
        <span>
          {fmt(timeRemaining)}
          {status === "paused" && (
            <span className="text-yellow-400 text-sm ml-2">PAUSED</span>
          )}
        </span>
      )}
    </div>
  );
}
