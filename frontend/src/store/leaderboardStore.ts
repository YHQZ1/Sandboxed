import { create } from "zustand";
import type { LeaderboardEntry, SubmissionStatus } from "../types";

export interface FeedItem {
  id: string;
  participantName: string;
  problemTitle: string;
  status: SubmissionStatus;
  score: number;
  timestamp: Date;
}

interface LeaderboardStore {
  leaderboard: LeaderboardEntry[];
  feed: FeedItem[];
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  addFeedItem: (item: FeedItem) => void;
  reset: () => void;
}

export const useLeaderboardStore = create<LeaderboardStore>((set) => ({
  leaderboard: [],
  feed: [],
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  addFeedItem: (item) => set((s) => ({ feed: [item, ...s.feed.slice(0, 49)] })),
  reset: () => set({ leaderboard: [], feed: [] }),
}));
