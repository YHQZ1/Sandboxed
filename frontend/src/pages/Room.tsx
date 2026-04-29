import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useSocket } from "../hooks/useSocket";
import HostRoom from "./HostRoom";
import ParticipantRoom from "./ParticipantRoom";
import ViewerRoom from "./ViewerRoom";
import NotFound from "./NotFound";

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { setMyIdentity } = useRoomStore();
  const [roomStatus, setRoomStatus] = useState<
    "loading" | "ok" | "not_found" | "ended"
  >("loading");

  const state = useMemo(() => {
    const rawState = location.state as {
      name: string;
      role: "host" | "participant" | "viewer";
    } | null;

    if (rawState) return rawState;

    const saved = sessionStorage.getItem(`room:${code}`);
    return saved
      ? (JSON.parse(saved) as {
          name: string;
          role: "host" | "participant" | "viewer";
        })
      : null;
  }, [location.state, code]);

  useEffect(() => {
    if (!state?.name) {
      navigate("/join");
      return;
    }

    sessionStorage.setItem(
      `room:${code}`,
      JSON.stringify({ name: state.name, role: state.role }),
    );

    setMyIdentity(state.name, state.role);
  }, [code, state?.name, state?.role, navigate, setMyIdentity]);

  const socket = useSocket(code!, state?.name || "", state?.role || "viewer");

  useEffect(() => {
    if (!socket) return;

    socket.on("room_joined", () => setRoomStatus("ok"));
    socket.on("room_not_found", () => setRoomStatus("not_found"));
    socket.on("contest_ended", () => setRoomStatus("ended"));
    socket.on("kicked", () => navigate("/join"));

    return () => {
      socket.off("room_joined");
      socket.off("room_not_found");
      socket.off("contest_ended");
      socket.off("kicked");
    };
  }, [socket, navigate]);

  if (roomStatus === "not_found") return <NotFound forceVariant="no-contest" />;
  if (roomStatus === "ended") return <NotFound forceVariant="contest-ended" />;

  if (!state?.name) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-8 h-8 border-2 border-[#262626] border-t-[#ededed] rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#737373]">Loading room...</p>
        </div>
      </div>
    );
  }

  if (state.role === "host") {
    return <HostRoom code={code!} socket={socket} />;
  }

  if (state.role === "participant") {
    return <ParticipantRoom code={code!} socket={socket} />;
  }

  return <ViewerRoom code={code!} />;
}
