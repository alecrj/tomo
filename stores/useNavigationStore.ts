import { create } from 'zustand';
import { NavigationMode, Destination, TransitRoute } from '../types';

interface NavigationStoreState {
  mode: NavigationMode;
  currentDestination: Destination | null;
  currentRoute: TransitRoute | null;
  arrivalDetected: boolean;

  // Actions
  viewDestination: (destination: Destination) => void;
  startNavigation: (destination: Destination, route: TransitRoute) => void;
  markArrived: () => void;
  exitCompanionMode: () => void;
  goHome: () => void;
  reset: () => void;
}

const initialState = {
  mode: 'idle' as NavigationMode,
  currentDestination: null,
  currentRoute: null,
  arrivalDetected: false,
};

export const useNavigationStore = create<NavigationStoreState>((set) => ({
  ...initialState,

  // User taps "See more" on destination card
  viewDestination: (destination) =>
    set({
      mode: 'viewing_detail',
      currentDestination: destination,
    }),

  // User taps "Take me there" - start navigation
  startNavigation: (destination, route) =>
    set({
      mode: 'navigating',
      currentDestination: destination,
      currentRoute: route,
      arrivalDetected: false,
    }),

  // Detect arrival at destination - switch to companion mode
  markArrived: () =>
    set({
      mode: 'companion_mode',
      arrivalDetected: true,
    }),

  // User done exploring, wants new destination
  exitCompanionMode: () =>
    set({
      mode: 'idle',
      currentDestination: null,
      currentRoute: null,
      arrivalDetected: false,
    }),

  // Quick action: Go home
  goHome: () =>
    set({
      mode: 'idle',
      currentDestination: null,
      currentRoute: null,
      arrivalDetected: false,
    }),

  reset: () => set(initialState),
}));
