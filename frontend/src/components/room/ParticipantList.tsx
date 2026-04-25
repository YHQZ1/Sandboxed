import { useRoomStore } from "../../store/roomStore";

export default function ParticipantList() {
  const { participants } = useRoomStore();

  return (
    <div className="flex flex-col gap-1">
      {participants.map((p) => (
        <div
          key={p.name}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800"
        >
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm text-zinc-300 flex-1">{p.name}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              p.role === "host"
                ? "bg-yellow-900 text-yellow-400"
                : p.role === "participant"
                  ? "bg-blue-900 text-blue-400"
                  : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {p.role}
          </span>
        </div>
      ))}
    </div>
  );
}
