import { useRoomStore } from "../../store/roomStore";
import { Socket } from "socket.io-client";
import api from "../../lib/api";

interface Props {
  showKick?: boolean;
  hostCode?: string;
  socket?: Socket;
}

const ROLE_STYLE: Record<string, string> = {
  host: "bg-[#ededed] text-[#0a0a0a]",
  participant: "bg-[#171717] text-[#ededed] border border-[#262626]",
  viewer: "bg-transparent text-[#737373] border border-[#262626]",
};

export default function ParticipantList({ showKick, hostCode, socket }: Props) {
  const { participants, removeParticipant } = useRoomStore();

  const handleKick = async (name: string) => {
    if (!hostCode) return;
    try {
      await api.delete(`/rooms/${hostCode}/participants/${name}`);
      removeParticipant(name);
      socket?.emit("kick_participant", { roomCode: hostCode, name });
    } catch (err) {
      console.error("Kick failed:", err);
    }
  };

  return (
    <div className="flex flex-col font-sans w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-2">
        <span className="text-sm font-medium text-[#737373]">
          People in room
        </span>
        <span className="text-xs font-medium text-[#404040]">
          {participants.length} online
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col">
        {participants.map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-3 py-3 border-b border-[#262626]/50 last:border-0 hover:bg-[#111111] transition-colors px-3 -mx-3 rounded-sm"
          >
            {/* Minimal Status Dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-[#ededed] opacity-50 flex-shrink-0" />

            <span className="text-sm font-medium text-[#f5f5f5] flex-1 truncate">
              {p.name}
            </span>

            {/* Role Badge */}
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-sm flex-shrink-0 ${ROLE_STYLE[p.role]}`}
            >
              {p.role}
            </span>

            {/* Evident Action Button */}
            {showKick && p.role !== "host" && (
              <button
                onClick={() => handleKick(p.name)}
                className="text-[10px] uppercase tracking-wider font-semibold text-[#ef4444] bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/20 hover:border-[#ef4444]/40 px-2 py-0.5 rounded-sm transition-colors ml-2"
              >
                Kick
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
