import { useEffect } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../socket/socket";
import { useRoomStore } from "../store/roomStore";
import { useTimerStore } from "../store/timerStore";
import { useLeaderboardStore } from "../store/leaderboardStore";
import type {
  Room,
  Problem,
  Participant,
  LeaderboardEntry,
  SubmissionStatus,
} from "../types";
import { getDeviceId } from "../lib/device";

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

interface SubmissionUpdateData {
  submissionId: string;
  participantName: string;
  problemTitle: string;
  status: SubmissionStatus;
  score: number;
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
    updateRoomStatus,
  } = useRoomStore();
  const { setTimer, setDuration } = useTimerStore();
  const { setLeaderboard } = useLeaderboardStore();

  useEffect(() => {
    const socket = connectSocket();
    const { addFeedItem } = useLeaderboardStore.getState();

    socket.emit("join_room", { roomCode, name, role, deviceId: getDeviceId() });

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
    socket.on("participant_left", ({ name: n }: { name: string }) =>
      removeParticipant(n),
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
        updateRoomStatus("active");
      },
    );

    socket.on(
      "timer_tick",
      ({
        timeRemaining,
        status,
      }: {
        timeRemaining: number;
        status: "active" | "paused";
      }) => setTimer(timeRemaining, status),
    );

    socket.on(
      "timer_paused",
      ({ timeRemaining }: { timeRemaining: number }) => {
        setTimer(timeRemaining, "paused");
        updateRoomStatus("paused");
      },
    );

    socket.on(
      "timer_resumed",
      ({ timeRemaining }: { timeRemaining: number }) => {
        setTimer(timeRemaining, "active");
        updateRoomStatus("active");
      },
    );

    socket.on(
      "contest_ended",
      ({ finalLeaderboard }: { finalLeaderboard: LeaderboardEntry[] }) => {
        setLeaderboard(finalLeaderboard || []);
        setTimer(0, "ended");
        updateRoomStatus("ended");
      },
    );

    socket.on(
      "leaderboard_update",
      ({ leaderboard }: { leaderboard: LeaderboardEntry[] }) =>
        setLeaderboard(leaderboard || []),
    );

    socket.on("problem_added", ({ problem }: { problem: Problem }) => {
      addProblem(problem);
    });

    socket.on("problem_updated", ({ problem }: { problem: Problem }) =>
      updateProblem(problem),
    );

    socket.on("submission_update", (data: SubmissionUpdateData) => {
      addFeedItem({
        id: data.submissionId,
        participantName: data.participantName,
        problemTitle: data.problemTitle,
        status: data.status,
        score: data.score,
        timestamp: new Date(),
      });
    });

    socket.on("violation_warning", (data: { count: number; max: number }) => {
      window.dispatchEvent(new CustomEvent("dojo:warning", { detail: data }));
    });

    socket.on("kicked", (data: { reason?: string } = {}) => {
      sessionStorage.removeItem(`room:${roomCode}`);
      window.dispatchEvent(
        new CustomEvent("dojo:kicked", { detail: data.reason || "" }),
      );
    });

    socket.on("banned", (data: { message?: string } = {}) => {
      sessionStorage.removeItem(`room:${roomCode}`);
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith(`dojo:v1:${roomCode}:`) ||
          key.startsWith(`dojo:solved:`)
        ) {
          localStorage.removeItem(key);
        }
      });
      window.dispatchEvent(
        new CustomEvent("dojo:kicked", {
          detail: data.message || "You have been banned from this room.",
        }),
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
      socket.off("submission_update");
      socket.off("violation_warning");
      socket.off("kicked");
      socket.off("banned")

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
    updateRoomStatus,
  ]);

  return getSocket();
};
