import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stamp } from '../types';
import { getStampsForCity } from '../constants/stamps';

interface StampsState {
  stamps: Stamp[];
  currentCity: string | null;

  // Computed getters
  completedCount: () => number;
  totalCount: () => number;
  progressPercentage: () => number;

  // Actions
  loadStampsForCity: (cityName: string) => void;
  completeStamp: (stampId: string) => void;
  uncompleteStamp: (stampId: string) => void;
  reset: () => void;
}

const initialState = {
  stamps: [] as Stamp[],
  currentCity: null,
};

export const useStampsStore = create<StampsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Computed values
      completedCount: () => get().stamps.filter((s) => s.completed).length,
      totalCount: () => get().stamps.length,
      progressPercentage: () => {
        const total = get().totalCount();
        if (total === 0) return 0;
        return Math.round((get().completedCount() / total) * 100);
      },

      // Actions
      loadStampsForCity: (cityName) => {
        const cityStamps = getStampsForCity(cityName);
        if (!cityStamps) {
          set({ stamps: [], currentCity: null });
          return;
        }

        // Initialize with completed: false unless already completed in state
        const existingStamps = get().stamps;
        const stamps: Stamp[] = cityStamps.map((stamp) => {
          const existing = existingStamps.find((s) => s.id === stamp.id);
          return {
            ...stamp,
            completed: existing?.completed || false,
            completedAt: existing?.completedAt || undefined,
          };
        });

        set({ stamps, currentCity: cityName });
      },

      completeStamp: (stampId) =>
        set((state) => ({
          stamps: state.stamps.map((stamp) =>
            stamp.id === stampId
              ? { ...stamp, completed: true, completedAt: Date.now() }
              : stamp
          ),
        })),

      uncompleteStamp: (stampId) =>
        set((state) => ({
          stamps: state.stamps.map((stamp) =>
            stamp.id === stampId
              ? { ...stamp, completed: false, completedAt: undefined }
              : stamp
          ),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'tomo-stamps-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
