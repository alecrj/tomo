import { create } from 'zustand';
import { Move } from '../types';

interface MovesState {
  moves: Move[];
  selectedMoveId: string | null;
  loading: boolean;
  excludedMoveIds: string[];

  // Actions
  setMoves: (moves: Move[]) => void;
  selectMove: (moveId: string | null) => void;
  excludeMove: (moveId: string) => void;
  clearExcludedMoves: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  moves: [] as Move[],
  selectedMoveId: null,
  loading: false,
  excludedMoveIds: [] as string[],
};

export const useMovesStore = create<MovesState>((set) => ({
  ...initialState,

  setMoves: (moves) => set({ moves }),
  selectMove: (moveId) => set({ selectedMoveId: moveId }),

  excludeMove: (moveId) =>
    set((state) => ({
      excludedMoveIds: [...state.excludedMoveIds, moveId],
    })),

  clearExcludedMoves: () => set({ excludedMoveIds: [] }),
  setLoading: (loading) => set({ loading }),
  reset: () => set(initialState),
}));
