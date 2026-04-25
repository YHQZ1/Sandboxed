import { useTimerStore } from "../store/timerStore";

export const useTimer = () => {
  return useTimerStore();
};
