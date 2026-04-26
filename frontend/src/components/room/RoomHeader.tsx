import Timer from "../timer/Timer";
import { useRoomStore } from "../../store/roomStore";

const STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting to start",
  active: "Contest in progress",
  paused: "Paused",
  ended: "Contest ended",
};

export default function RoomHeader() {
  const { room } = useRoomStore();
  if (!room) return null;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[#262626] bg-[#0a0a0a] flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <span className="text-lg font-medium tracking-tight text-[#f5f5f5]">
          Dojo.
        </span>
        <span className="text-[#404040]">/</span>
        <span className="text-sm font-medium text-[#a3a3a3] truncate max-w-[200px]">
          {room.name}
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#171717] border border-[#262626] text-[#737373] px-2 py-0.5 rounded-sm">
          {room.code}
        </span>
      </div>

      <Timer />

      <div className="text-xs font-medium text-[#737373] flex items-center gap-2">
        {room.status === "active" && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#ededed] animate-pulse opacity-80" />
        )}
        {STATUS_LABEL[room.status] || "Status unknown"}
      </div>
    </header>
  );
}
