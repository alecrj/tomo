import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  locationPermissionGranted: boolean;
  microphonePermissionGranted: boolean;

  // Actions
  completeOnboarding: () => void;
  setLocationPermission: (granted: boolean) => void;
  setMicrophonePermission: (granted: boolean) => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      locationPermissionGranted: false,
      microphonePermissionGranted: false,

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
        console.log('[Onboarding] Completed');
      },

      setLocationPermission: (granted) => {
        set({ locationPermissionGranted: granted });
        console.log('[Onboarding] Location permission:', granted);
      },

      setMicrophonePermission: (granted) => {
        set({ microphonePermissionGranted: granted });
        console.log('[Onboarding] Microphone permission:', granted);
      },

      resetOnboarding: () => {
        set({
          hasCompletedOnboarding: false,
          locationPermissionGranted: false,
          microphonePermissionGranted: false,
        });
        console.log('[Onboarding] Reset');
      },
    }),
    {
      name: 'tomo-onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
