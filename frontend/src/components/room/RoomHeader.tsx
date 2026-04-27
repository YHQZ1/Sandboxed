import Timer from "../timer/Timer";
import { useRoomStore } from "../../store/roomStore";
import { useNavigate, useParams } from "react-router-dom";

const STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting to start",
  active: "Contest in progress",
  paused: "Paused",
  ended: "Contest ended",
};

export default function RoomHeader() {
  const { room, myName, myRole } = useRoomStore();
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();

  if (!room) return null;

  const handleViewResults = () => {
    if (myRole === "host") {
      navigate(`/results/${code}`);
    } else {
      navigate(`/results/${code}?name=${encodeURIComponent(myName)}`);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[#262626] bg-[#0a0a0a] flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <span className="text-lg font-medium tracking-tight text-[#f5f5f5]">
          Sandboxed.
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

      <div className="flex items-center gap-3">
        {room.status === "ended" ? (
          <button
            onClick={handleViewResults}
            className="px-4 py-1.5 text-sm font-medium bg-transparent border border-[#262626] text-[#ededed] rounded-sm hover:bg-[#171717] transition-colors"
          >
            View Results
          </button>
        ) : (
          <div className="text-xs font-medium text-[#737373] flex items-center gap-2">
            {room.status === "active" && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#ededed] animate-pulse opacity-80" />
            )}
            {STATUS_LABEL[room.status] || "Status unknown"}
          </div>
        )}
      </div>
    </header>
  );
}
