import Timer from "../timer/Timer";
import { useRoomStore } from "../../store/roomStore";

export default function RoomHeader() {
  const { room } = useRoomStore();
  if (!room) return null;

  return (
    <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <span className="font-black text-lg">Dojo</span>
        <span className="font-semibold">{room.name}</span>
        <span className="font-mono text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">
          {room.code}
        </span>
      </div>
      <Timer />
      <div className="text-xs text-zinc-500 w-32 text-right">
        {room.status === "waiting" && "Waiting to start"}
        {room.status === "active" && "Contest in progress"}
        {room.status === "paused" && "Paused"}
        {room.status === "ended" && "Contest ended"}
      </div>
    </div>
  );
}
