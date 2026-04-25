import { useEffect } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../socket/socket";
import { useRoomStore } from "../store/roomStore";
import { useTimerStore } from "../store/timerStore";
import { useLeaderboardStore } from "../store/leaderboardStore";
import type { Problem, Participant } from "../types";

export const useSocket = (
  roomCode: string,
  name: string,
  role: "host" | "participant" | "viewer",
) => {
  const {
    setRoom,
    setProblems,
    setParticipants,
    addParticipant,
    removeParticipant,
    addProblem,
    updateProblem,
  } = useRoomStore();
  const { setTimer, setDuration } = useTimerStore();
  const { setLeaderboard } = useLeaderboardStore();

  useEffect(() => {
    const socket = connectSocket();

    socket.emit("join_room", { roomCode, name, role });

    socket.on("room_joined", (data) => {
      setRoom(data.room);
      setProblems(data.problems || []);
      setParticipants(data.participants || []);
      setLeaderboard(data.leaderboard || []);
      if (data.timer?.duration) {
        const duration = parseInt(data.timer.duration);
        const elapsed = parseInt(data.timer.elapsed || "0");
        setDuration(duration);
        setTimer(duration - elapsed, data.timer.status);
      }
    });

    socket.on("participant_joined", (data: Participant) =>
      addParticipant(data),
    );
    socket.on("participant_left", ({ name }: { name: string }) =>
      removeParticipant(name),
    );

    socket.on("timer_started", ({ duration, timeRemaining }: any) => {
      setDuration(duration);
      setTimer(timeRemaining, "active");
    });
    socket.on("timer_tick", ({ timeRemaining, status }: any) =>
      setTimer(timeRemaining, status),
    );
    socket.on("timer_paused", ({ timeRemaining }: any) =>
      setTimer(timeRemaining, "paused"),
    );
    socket.on("timer_resumed", ({ timeRemaining }: any) =>
      setTimer(timeRemaining, "active"),
    );
    socket.on("contest_ended", ({ finalLeaderboard }: any) => {
      setLeaderboard(finalLeaderboard || []);
      setTimer(0, "ended");
    });

    socket.on("leaderboard_update", ({ leaderboard }: any) =>
      setLeaderboard(leaderboard || []),
    );
    socket.on("problem_added", (data: { problem: Problem }) =>
      addProblem(data.problem),
    );
    socket.on("problem_updated", (data: { problem: Problem }) =>
      updateProblem(data.problem),
    );

    return () => {
      socket.off("room_joined");
      socket.off("participant_joined");
      socket.off("participant_left");
      socket.off("timer_started");
      socket.off("timer_tick");
      socket.off("timer_paused");
      socket.off("timer_resumed");
      socket.off("contest_ended");
      socket.off("leaderboard_update");
      socket.off("problem_added");
      socket.off("problem_updated");
      disconnectSocket();
    };
  }, [roomCode, name, role]);

  return getSocket();
};
