import { useEffect } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../socket/socket";
import { useRoomStore } from "../store/roomStore";
import { useTimerStore } from "../store/timerStore";
import { useLeaderboardStore } from "../store/leaderboardStore";
import type { Room, Problem, Participant, LeaderboardEntry } from "../types";

interface RoomJoinedData {
  room: Room;
  problems: Problem[];
  participants: Participant[];
  leaderboard: LeaderboardEntry[];
  timer?: {
    duration: string;
    elapsed: string;
    status: "waiting" | "active" | "paused" | "ended";
  };
}

interface TimerTickData {
  timeRemaining: number;
  status: "active" | "paused";
}

interface LeaderboardUpdateData {
  leaderboard: LeaderboardEntry[];
}

interface ProblemEventData {
  problem: Problem;
}

interface ViolationWarningData {
  count: number;
  max: number;
}

interface KickedData {
  reason?: string;
}

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

    socket.on("room_joined", (data: RoomJoinedData) => {
      setRoom(data.room);
      setProblems(data.problems || []);
      setParticipants(data.participants || []);
      setLeaderboard(data.leaderboard || []);
      if (data.timer?.duration) {
        const duration = parseInt(data.timer.duration, 10);
        const elapsed = parseInt(data.timer.elapsed || "0", 10);
        setDuration(duration);
        setTimer(duration - elapsed, data.timer.status);
      }
    });

    socket.on("participant_joined", (data: Participant) =>
      addParticipant(data),
    );

    socket.on("participant_left", ({ name: leftName }: { name: string }) =>
      removeParticipant(leftName),
    );

    socket.on(
      "timer_started",
      ({
        duration,
        timeRemaining,
      }: {
        duration: number;
        timeRemaining: number;
      }) => {
        setDuration(duration);
        setTimer(timeRemaining, "active");
      },
    );

    socket.on("timer_tick", ({ timeRemaining, status }: TimerTickData) =>
      setTimer(timeRemaining, status),
    );

    socket.on("timer_paused", ({ timeRemaining }: { timeRemaining: number }) =>
      setTimer(timeRemaining, "paused"),
    );

    socket.on("timer_resumed", ({ timeRemaining }: { timeRemaining: number }) =>
      setTimer(timeRemaining, "active"),
    );

    socket.on(
      "contest_ended",
      ({ finalLeaderboard }: { finalLeaderboard: LeaderboardEntry[] }) => {
        setLeaderboard(finalLeaderboard || []);
        setTimer(0, "ended");
      },
    );

    socket.on("leaderboard_update", ({ leaderboard }: LeaderboardUpdateData) =>
      setLeaderboard(leaderboard || []),
    );

    socket.on("problem_added", (data: ProblemEventData) =>
      addProblem(data.problem),
    );
    socket.on("problem_updated", (data: ProblemEventData) =>
      updateProblem(data.problem),
    );

    socket.on("violation_warning", (data: ViolationWarningData) => {
      window.dispatchEvent(new CustomEvent("dojo:warning", { detail: data }));
    });

    socket.on("kicked", (data: KickedData = {}) => {
      sessionStorage.removeItem(`room:${roomCode}`);
      window.dispatchEvent(
        new CustomEvent("dojo:kicked", { detail: data.reason }),
      );
    });

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
      socket.off("violation_warning");
      socket.off("kicked");

      sessionStorage.removeItem(`room:${roomCode}`);
      disconnectSocket();
    };
  }, [
    roomCode,
    name,
    role,
    setRoom,
    setProblems,
    setParticipants,
    setLeaderboard,
    setDuration,
    setTimer,
    addParticipant,
    removeParticipant,
    addProblem,
    updateProblem,
  ]);

  return getSocket();
};
