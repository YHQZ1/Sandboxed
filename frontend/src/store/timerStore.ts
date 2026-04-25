import { create } from 'zustand';

interface TimerStore {
  timeRemaining: number;
  status: 'waiting' | 'active' | 'paused' | 'ended';
  duration: number;
  setTimer: (timeRemaining: number, status: TimerStore['status']) => void;
  setDuration: (duration: number) => void;
  reset: () => void;
}

export const useTimerStore = create<TimerStore>((set) => ({
  timeRemaining: 0,
  status: 'waiting',
  duration: 0,
  setTimer: (timeRemaining, status) => set({ timeRemaining, status }),
  setDuration: (duration) => set({ duration, timeRemaining: duration }),
  reset: () => set({ timeRemaining: 0, status: 'waiting', duration: 0 }),
}));