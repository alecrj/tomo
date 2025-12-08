import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Visit } from '../types';

interface TripState {
  startDate: string | null; // ISO date string
  currentDay: number;
  visits: Visit[];
  completedMoveIds: string[];
  totalWalkingMinutes: number;

  // Actions
  startTrip: (startDate: string) => void;
  addVisit: (visit: Visit) => void;
  completeMove: (moveId: string) => void;
  addWalkingTime: (minutes: number) => void;
  reset: () => void;
}

const initialState = {
  startDate: null,
  currentDay: 0,
  visits: [] as Visit[],
  completedMoveIds: [] as string[],
  totalWalkingMinutes: 0,
};

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      ...initialState,

      startTrip: (startDate) => set({ startDate, currentDay: 1 }),

      addVisit: (visit) =>
        set((state) => ({
          visits: [...state.visits, visit],
        })),

      completeMove: (moveId) =>
        set((state) => ({
          completedMoveIds: [...state.completedMoveIds, moveId],
        })),

      addWalkingTime: (minutes) =>
        set((state) => ({
          totalWalkingMinutes: state.totalWalkingMinutes + minutes,
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'tomo-trip-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
