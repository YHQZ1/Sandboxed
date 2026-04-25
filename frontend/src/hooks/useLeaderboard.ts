import { useLeaderboardStore } from "../store/leaderboardStore";

export const useLeaderboard = () => {
  return useLeaderboardStore();
};
