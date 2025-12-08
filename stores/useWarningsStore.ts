import { create } from 'zustand';
import { Warning } from '../types';

interface WarningsState {
  warnings: Warning[];

  // Actions
  addWarning: (warning: Warning) => void;
  dismissWarning: (warningId: string) => void;
  clearExpiredWarnings: () => void;
  clearAllWarnings: () => void;

  // Getters
  getActiveWarnings: () => Warning[];
  hasUrgentWarnings: () => boolean;
}

const initialState = {
  warnings: [] as Warning[],
};

export const useWarningsStore = create<WarningsState>((set, get) => ({
  ...initialState,

  addWarning: (warning) =>
    set((state) => {
      // Don't add duplicate warnings of same type
      const exists = state.warnings.some(
        (w) => w.type === warning.type && !w.dismissed
      );
      if (exists) {
        // Update existing warning
        return {
          warnings: state.warnings.map((w) =>
            w.type === warning.type && !w.dismissed ? warning : w
          ),
        };
      }
      return { warnings: [...state.warnings, warning] };
    }),

  dismissWarning: (warningId) =>
    set((state) => ({
      warnings: state.warnings.map((w) =>
        w.id === warningId ? { ...w, dismissed: true } : w
      ),
    })),

  clearExpiredWarnings: () =>
    set((state) => ({
      warnings: state.warnings.filter(
        (w) => !w.expiresAt || w.expiresAt > Date.now()
      ),
    })),

  clearAllWarnings: () => set({ warnings: [] }),

  getActiveWarnings: () =>
    get().warnings.filter((w) => !w.dismissed && (!w.expiresAt || w.expiresAt > Date.now())),

  hasUrgentWarnings: () =>
    get().getActiveWarnings().some((w) => w.severity === 'urgent'),
}));
