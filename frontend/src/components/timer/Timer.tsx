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

  const timerColor =
    status === "ended" || (status === "active" && timeRemaining < 300)
      ? "text-[#ef4444]"
      : status === "paused"
        ? "text-[#737373]"
        : "text-[#ededed]";

  return (
    <div className="flex flex-col items-center justify-center font-sans">
      {status === "waiting" && (
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#737373]">
          Not started
        </span>
      )}

      {status === "ended" && (
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#ef4444]">
          Ended
        </span>
      )}

      {(status === "active" || status === "paused") && (
        <div className="flex flex-col items-center">
          <span
            className={`text-xl font-medium tabular-nums tracking-tight leading-none ${timerColor}`}
          >
            {fmt(timeRemaining)}
          </span>
          <span
            className={`text-[9px] font-semibold tracking-wider uppercase mt-1 ${
              status === "paused" ? "text-[#737373]" : "text-[#a3a3a3]"
            }`}
          >
            {status === "paused" ? "Paused" : "Remaining"}
          </span>
        </div>
      )}
    </div>
  );
}
