import { useState } from "react";
import { useRoomStore } from "../../store/roomStore";

export default function RoomCodeShare() {
  const { room } = useRoomStore();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center bg-[#171717] border border-[#262626] rounded-sm h-7 font-sans">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#737373] px-2.5 flex items-center h-full border-r border-[#262626]">
        Code
      </span>
      <span className="text-xs font-mono font-medium text-[#ededed] px-3 flex items-center h-full tracking-wider border-r border-[#262626]">
        {room.code}
      </span>
      <button
        onClick={handleCopy}
        className="text-[10px] uppercase font-semibold text-[#a3a3a3] hover:text-[#ededed] hover:bg-[#262626] px-2.5 flex items-center h-full transition-colors cursor-pointer"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
