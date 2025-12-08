import { create } from 'zustand';
import { Destination } from '../types';

interface DestinationsState {
  currentDestination: Destination | null;
  loading: boolean;
  excludedTodayIds: string[]; // For "Something else" tracking

  // Actions
  setDestination: (destination: Destination) => void;
  excludeDestination: (destinationId: string) => void;
  clearExcludedToday: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  currentDestination: null,
  loading: false,
  excludedTodayIds: [] as string[],
};

export const useDestinationsStore = create<DestinationsState>((set) => ({
  ...initialState,

  setDestination: (destination) => set({ currentDestination: destination }),

  excludeDestination: (destinationId) =>
    set((state) => ({
      excludedTodayIds: [...state.excludedTodayIds, destinationId],
    })),

  clearExcludedToday: () => set({ excludedTodayIds: [] }),
  setLoading: (loading) => set({ loading }),
  reset: () => set(initialState),
}));
