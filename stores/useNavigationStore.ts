import { create } from 'zustand';
import { NavigationMode, Destination, TransitRoute, Coordinates } from '../types';

/**
 * Waypoint - A stop along the route
 */
export interface Waypoint {
  id: string;
  name: string;
  address?: string;
  coordinates: Coordinates;
  visited: boolean;
  addedTime?: number; // Additional minutes this stop adds
}

interface NavigationStoreState {
  mode: NavigationMode;
  currentDestination: Destination | null;
  currentRoute: TransitRoute | null;
  arrivalDetected: boolean;

  // Waypoint support for multi-stop routes
  waypoints: Waypoint[];
  currentWaypointIndex: number; // -1 means heading to final destination

  // Route metadata
  originalEta: Date | null;

  // Actions
  viewDestination: (destination: Destination) => void;
  startNavigation: (destination: Destination, route: TransitRoute) => void;
  markArrived: () => void;
  exitCompanionMode: () => void;
  goHome: () => void;
  reset: () => void;

  // Waypoint actions
  addWaypoint: (waypoint: Omit<Waypoint, 'id' | 'visited'>, index?: number) => void;
  removeWaypoint: (waypointId: string) => void;
  markWaypointVisited: (waypointId: string) => void;
  clearWaypoints: () => void;

  // Route update
  updateRoute: (route: TransitRoute) => void;
  setOriginalEta: (eta: Date) => void;
}

const generateId = () => `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const initialState = {
  mode: 'idle' as NavigationMode,
  currentDestination: null,
  currentRoute: null,
  arrivalDetected: false,
  waypoints: [] as Waypoint[],
  currentWaypointIndex: -1,
  originalEta: null,
};

export const useNavigationStore = create<NavigationStoreState>((set, get) => ({
  ...initialState,

  // User taps "See more" on destination card
  viewDestination: (destination) =>
    set({
      mode: 'viewing_detail',
      currentDestination: destination,
    }),

  // User taps "Take me there" - start navigation
  startNavigation: (destination, route) => {
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + route.totalDuration);

    set({
      mode: 'navigating',
      currentDestination: destination,
      currentRoute: route,
      arrivalDetected: false,
      waypoints: [],
      currentWaypointIndex: -1,
      originalEta: eta,
    });
  },

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
      waypoints: [],
      currentWaypointIndex: -1,
      originalEta: null,
    }),

  // Quick action: Go home
  goHome: () =>
    set({
      mode: 'idle',
      currentDestination: null,
      currentRoute: null,
      arrivalDetected: false,
      waypoints: [],
      currentWaypointIndex: -1,
      originalEta: null,
    }),

  reset: () => set(initialState),

  // Add a waypoint (stop) to the route
  addWaypoint: (waypoint, index) => {
    const { waypoints } = get();
    const newWaypoint: Waypoint = {
      ...waypoint,
      id: generateId(),
      visited: false,
    };

    const newWaypoints = [...waypoints];
    if (index !== undefined && index >= 0 && index <= waypoints.length) {
      newWaypoints.splice(index, 0, newWaypoint);
    } else {
      // Add to the end (before final destination)
      newWaypoints.push(newWaypoint);
    }

    set({ waypoints: newWaypoints });
  },

  // Remove a waypoint from the route
  removeWaypoint: (waypointId) => {
    const { waypoints, currentWaypointIndex } = get();
    const index = waypoints.findIndex(w => w.id === waypointId);
    if (index === -1) return;

    const newWaypoints = waypoints.filter(w => w.id !== waypointId);

    // Adjust current waypoint index if needed
    let newIndex = currentWaypointIndex;
    if (index < currentWaypointIndex) {
      newIndex = currentWaypointIndex - 1;
    } else if (index === currentWaypointIndex) {
      newIndex = Math.min(currentWaypointIndex, newWaypoints.length - 1);
    }

    set({
      waypoints: newWaypoints,
      currentWaypointIndex: newWaypoints.length === 0 ? -1 : newIndex,
    });
  },

  // Mark a waypoint as visited (arrived)
  markWaypointVisited: (waypointId) => {
    const { waypoints, currentWaypointIndex } = get();
    const index = waypoints.findIndex(w => w.id === waypointId);
    if (index === -1) return;

    const newWaypoints = waypoints.map((w, i) =>
      i === index ? { ...w, visited: true } : w
    );

    // Move to next waypoint or final destination
    const nextUnvisited = newWaypoints.findIndex((w, i) => i > index && !w.visited);
    const newIndex = nextUnvisited === -1 ? -1 : nextUnvisited;

    set({
      waypoints: newWaypoints,
      currentWaypointIndex: newIndex,
    });
  },

  // Clear all waypoints
  clearWaypoints: () => {
    set({
      waypoints: [],
      currentWaypointIndex: -1,
    });
  },

  // Update the current route (after recalculation)
  updateRoute: (route) => {
    set({ currentRoute: route });
  },

  // Set the original ETA
  setOriginalEta: (eta) => {
    set({ originalEta: eta });
  },
}));
