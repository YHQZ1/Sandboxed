/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import type { Room, Problem, Participant } from "../types";

interface RoomStore {
  room: Room | null;
  problems: Problem[];
  participants: Participant[];
  submissions: any[];
  myName: string;
  myRole: "host" | "participant" | "viewer" | null;
  setRoom: (room: Room) => void;
  setProblems: (problems: Problem[]) => void;
  setSubmissions: (submissions: any[]) => void;
  addProblem: (problem: Problem) => void;
  updateProblem: (problem: Problem) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (name: string) => void;
  setMyIdentity: (
    name: string,
    role: "host" | "participant" | "viewer",
  ) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  problems: [],
  participants: [],
  submissions: [], // Added this
  myName: "",
  myRole: null,

  setRoom: (room) => set({ room }),
  setProblems: (problems) => set({ problems }),
  setSubmissions: (submissions) => set({ submissions }), // Added this
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
  reset: () =>
    set({
      room: null,
      problems: [],
      participants: [],
      submissions: [],
      myName: "",
      myRole: null,
    }),
}));
