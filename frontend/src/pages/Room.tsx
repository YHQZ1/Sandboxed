import { useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useSocket } from "../hooks/useSocket";
import HostRoom from "./HostRoom";
import ParticipantRoom from "./ParticipantRoom";
import ViewerRoom from "./ViewerRoom";

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { setMyIdentity } = useRoomStore();

  const state = useMemo(() => {
    const rawState = location.state as {
      name: string;
      role: "host" | "participant" | "viewer";
    } | null;

    if (rawState) return rawState;

    const saved = sessionStorage.getItem(`room:${code}`);
    return saved ? JSON.parse(saved) : null;
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

  if (!state?.name) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-sans">
        <p className="text-[#737373] text-sm animate-pulse">Redirecting...</p>
      </div>
    );
  }

  if (state.role === "host") return <HostRoom code={code!} socket={socket} />;
  if (state.role === "participant")
    return <ParticipantRoom code={code!} socket={socket} />;

  return <ViewerRoom code={code!} />;
}
