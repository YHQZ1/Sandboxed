import { create } from "zustand";
import type { LeaderboardEntry } from "../types";

interface LeaderboardStore {
  leaderboard: LeaderboardEntry[];
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  reset: () => void;
}

export const useLeaderboardStore = create<LeaderboardStore>((set) => ({
  leaderboard: [],
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  reset: () => set({ leaderboard: [] }),
}));
