import { create } from "zustand";
import type { Room, Problem, Participant, Submission } from "../types";

interface RoomStore {
  room: Room | null;
  problems: Problem[];
  participants: Participant[];
  submissions: Submission[];
  myName: string;
  myRole: "host" | "participant" | "viewer" | null;
  solvedProblemIds: Set<string>;
  setRoom: (room: Room) => void;
  updateRoomStatus: (status: "waiting" | "active" | "paused" | "ended") => void;
  setProblems: (problems: Problem[]) => void;
  setSubmissions: (submissions: Submission[]) => void;
  addProblem: (problem: Problem) => void;
  updateProblem: (problem: Problem) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (name: string) => void;
  setMyIdentity: (
    name: string,
    role: "host" | "participant" | "viewer",
  ) => void;
  markProblemSolved: (problemId: string) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  problems: [],
  participants: [],
  submissions: [],
  myName: "",
  myRole: null,
  solvedProblemIds: new Set<string>(),

  setRoom: (room) => set({ room }),
  updateRoomStatus: (status) =>
    set((s) => ({ room: s.room ? { ...s.room, status } : null })),
  setProblems: (problems) => set({ problems }),
  setSubmissions: (submissions) => set({ submissions }),
  addProblem: (problem) => set((s) => ({ problems: [...s.problems, problem] })),
  updateProblem: (problem) =>
    set((s) => ({
      problems: s.problems.map((p) => (p.id === problem.id ? problem : p)),
    })),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) =>
    set((s) => ({
      participants: [
        ...s.participants.filter((p) => p.name !== participant.name),
        participant,
      ],
    })),
  removeParticipant: (name) =>
    set((s) => ({
      participants: s.participants.filter((p) => p.name !== name),
    })),
  setMyIdentity: (name, role) => set({ myName: name, myRole: role }),
  markProblemSolved: (problemId) =>
    set((s) => {
      const updated = new Set(s.solvedProblemIds);
      updated.add(problemId);
      localStorage.setItem(`dojo:solved:${problemId}`, "1");
      return { solvedProblemIds: updated };
    }),
  reset: () =>
    set({
      room: null,
      problems: [],
      participants: [],
      submissions: [],
      myName: "",
      myRole: null,
      solvedProblemIds: new Set(),
    }),
}));
