import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useSocket } from "../hooks/useSocket";
import HostRoom from "./HostRoom";
import ParticipantRoom from "./ParticipantRoom";
import ViewerRoom from "./ViewerRoom";
import NotFound from "./NotFound";

type RoomState = {
  name: string;
  role: "host" | "participant" | "viewer";
} | null;

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { setMyIdentity } = useRoomStore();

  const [roomStatus, setRoomStatus] = useState<"loading" | "ok" | "not_found">(
    "loading",
  );

  const [state] = useState<RoomState>(() => {
    const rawState = location.state as RoomState;
    if (rawState?.name) return rawState;
    const saved = sessionStorage.getItem(`room:${code}`);
    return saved ? JSON.parse(saved) : null;
  });

  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!state?.name) {
      navigate("/join", { replace: true });
      return;
    }
    sessionStorage.setItem(
      `room:${code}`,
      JSON.stringify({ name: state.name, role: state.role }),
    );
    setMyIdentity(state.name, state.role);
  }, []);

  const socket = useSocket(code!, state?.name || "", state?.role || "viewer");

  useEffect(() => {
    if (!socket) return;

    const onJoined = () => setRoomStatus("ok");
    const onNotFound = () => setRoomStatus("not_found");
    const onEnded = () => {
      if (stateRef.current?.role === "host") {
        setRoomStatus("ok");
      } else {
        sessionStorage.removeItem(`room:${code}`);
        navigate(
          `/results/${code}?name=${encodeURIComponent(stateRef.current?.name || "")}`,
          { replace: true },
        );
      }
    };

    socket.on("room_joined", onJoined);
    socket.on("room_not_found", onNotFound);
    socket.on("contest_ended", onEnded);

    return () => {
      socket.off("room_joined", onJoined);
      socket.off("room_not_found", onNotFound);
      socket.off("contest_ended", onEnded);
    };
  }, [socket]);

  if (roomStatus === "not_found") return <NotFound forceVariant="no-contest" />;

  if (roomStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-8 h-8 border-2 border-[#262626] border-t-[#ededed] rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#737373]">Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (!state?.name) return null;

  if (state.role === "host") return <HostRoom code={code!} socket={socket} />;
  if (state.role === "participant")
    return <ParticipantRoom code={code!} socket={socket} />;
  return <ViewerRoom code={code!} />;
}
