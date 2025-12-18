import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeBase } from '../types';

export type TomoTone = 'casual' | 'friendly' | 'professional';
export type EmojiUsage = 'lots' | 'some' | 'none';
export type ResponseLength = 'brief' | 'balanced' | 'detailed';
export type NotificationLevel = 'minimal' | 'balanced' | 'full';

interface PreferencesState {
  homeBase: HomeBase | null;
  walkingTolerance: 'low' | 'medium' | 'high';
  budgetLevel: 'budget' | 'moderate' | 'luxury';
  dietary: string[];
  interests: string[];
  avoidCrowds: boolean;
  temperatureUnit: 'C' | 'F';

  // Tomo Personality
  tomoTone: TomoTone;
  emojiUsage: EmojiUsage;
  responseLength: ResponseLength;

  // Notification Preferences
  notificationLevel: NotificationLevel;
  lastTrainWarnings: boolean;
  placeClosingWarnings: boolean;
  weatherAlerts: boolean;
  budgetAlerts: boolean;
  itineraryReminders: boolean;

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
  setTomoTone: (tone: TomoTone) => void;
  setEmojiUsage: (usage: EmojiUsage) => void;
  setResponseLength: (length: ResponseLength) => void;
  setNotificationLevel: (level: NotificationLevel) => void;
  setLastTrainWarnings: (enabled: boolean) => void;
  setPlaceClosingWarnings: (enabled: boolean) => void;
  setWeatherAlerts: (enabled: boolean) => void;
  setBudgetAlerts: (enabled: boolean) => void;
  setItineraryReminders: (enabled: boolean) => void;
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
  // Tomo Personality
  tomoTone: 'friendly' as TomoTone,
  emojiUsage: 'some' as EmojiUsage,
  responseLength: 'balanced' as ResponseLength,
  // Notification Preferences
  notificationLevel: 'balanced' as NotificationLevel,
  lastTrainWarnings: true,
  placeClosingWarnings: true,
  weatherAlerts: true,
  budgetAlerts: true,
  itineraryReminders: true,
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
      setTomoTone: (tone) => set({ tomoTone: tone }),
      setEmojiUsage: (usage) => set({ emojiUsage: usage }),
      setResponseLength: (length) => set({ responseLength: length }),
      setNotificationLevel: (level) => set({ notificationLevel: level }),
      setLastTrainWarnings: (enabled) => set({ lastTrainWarnings: enabled }),
      setPlaceClosingWarnings: (enabled) => set({ placeClosingWarnings: enabled }),
      setWeatherAlerts: (enabled) => set({ weatherAlerts: enabled }),
      setBudgetAlerts: (enabled) => set({ budgetAlerts: enabled }),
      setItineraryReminders: (enabled) => set({ itineraryReminders: enabled }),
      reset: () => set(initialState),
    }),
    {
      name: 'tomo-preferences-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
