import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeBase } from '../types';

interface PreferencesState {
  homeBase: HomeBase | null;
  walkingTolerance: 'low' | 'medium' | 'high';
  budgetLevel: 'budget' | 'moderate' | 'luxury';
  dietary: string[];
  interests: string[];
  avoidCrowds: boolean;
  temperatureUnit: 'C' | 'F';

  // Actions
  setHomeBase: (homeBase: HomeBase) => void;
  setWalkingTolerance: (tolerance: 'low' | 'medium' | 'high') => void;
  setBudgetLevel: (level: 'budget' | 'moderate' | 'luxury') => void;
  addDietaryRestriction: (restriction: string) => void;
  removeDietaryRestriction: (restriction: string) => void;
  addInterest: (interest: string) => void;
  removeInterest: (interest: string) => void;
  setAvoidCrowds: (avoid: boolean) => void;
  setTemperatureUnit: (unit: 'C' | 'F') => void;
  reset: () => void;
}

const initialState = {
  homeBase: null,
  walkingTolerance: 'medium' as const,
  budgetLevel: 'moderate' as const,
  dietary: [] as string[],
  interests: [] as string[],
  avoidCrowds: false,
  temperatureUnit: 'C' as const,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...initialState,

      setHomeBase: (homeBase) => set({ homeBase }),
      setWalkingTolerance: (tolerance) => set({ walkingTolerance: tolerance }),
      setBudgetLevel: (level) => set({ budgetLevel: level }),

      addDietaryRestriction: (restriction) =>
        set((state) => ({
          dietary: [...state.dietary, restriction],
        })),

      removeDietaryRestriction: (restriction) =>
        set((state) => ({
          dietary: state.dietary.filter((d) => d !== restriction),
        })),

      addInterest: (interest) =>
        set((state) => ({
          interests: [...state.interests, interest],
        })),

      removeInterest: (interest) =>
        set((state) => ({
          interests: state.interests.filter((i) => i !== interest),
        })),

      setAvoidCrowds: (avoid) => set({ avoidCrowds: avoid }),
      setTemperatureUnit: (unit) => set({ temperatureUnit: unit }),
      reset: () => set(initialState),
    }),
    {
      name: 'tomo-preferences-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
