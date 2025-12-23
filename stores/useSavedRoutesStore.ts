import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TransitRoute, Coordinates } from '../types';
import { TravelMode } from '../services/routes';

/**
 * Saved route - a route the user wants to keep for later use
 */
export interface SavedRoute {
  id: string;
  name: string;                // User-given name or destination name
  origin: Coordinates;
  destination: Coordinates;
  destinationName: string;     // Name of the destination
  destinationAddress?: string; // Address if available
  route: TransitRoute;
  travelMode: TravelMode;
  savedAt: number;             // Timestamp when saved
  lastUsedAt?: number;         // Timestamp when last used
  useCount: number;            // How many times this route was used
}

interface SavedRoutesStoreState {
  routes: SavedRoute[];

  // Actions
  saveRoute: (params: {
    name: string;
    origin: Coordinates;
    destination: Coordinates;
    destinationName: string;
    destinationAddress?: string;
    route: TransitRoute;
    travelMode: TravelMode;
  }) => void;

  deleteRoute: (id: string) => void;
  renameRoute: (id: string, newName: string) => void;
  markRouteUsed: (id: string) => void;
  getRoute: (id: string) => SavedRoute | undefined;
  getRecentRoutes: (limit?: number) => SavedRoute[];
  getFrequentRoutes: (limit?: number) => SavedRoute[];
  clearAll: () => void;
}

const generateId = () => `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useSavedRoutesStore = create<SavedRoutesStoreState>()(
  persist(
    (set, get) => ({
      routes: [],

      saveRoute: (params) => {
        const newRoute: SavedRoute = {
          id: generateId(),
          name: params.name,
          origin: params.origin,
          destination: params.destination,
          destinationName: params.destinationName,
          destinationAddress: params.destinationAddress,
          route: params.route,
          travelMode: params.travelMode,
          savedAt: Date.now(),
          useCount: 0,
        };

        set((state) => ({
          routes: [newRoute, ...state.routes],
        }));
      },

      deleteRoute: (id) => {
        set((state) => ({
          routes: state.routes.filter((r) => r.id !== id),
        }));
      },

      renameRoute: (id, newName) => {
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === id ? { ...r, name: newName } : r
          ),
        }));
      },

      markRouteUsed: (id) => {
        set((state) => ({
          routes: state.routes.map((r) =>
            r.id === id
              ? { ...r, lastUsedAt: Date.now(), useCount: r.useCount + 1 }
              : r
          ),
        }));
      },

      getRoute: (id) => {
        return get().routes.find((r) => r.id === id);
      },

      getRecentRoutes: (limit = 5) => {
        return [...get().routes]
          .sort((a, b) => (b.lastUsedAt || b.savedAt) - (a.lastUsedAt || a.savedAt))
          .slice(0, limit);
      },

      getFrequentRoutes: (limit = 5) => {
        return [...get().routes]
          .sort((a, b) => b.useCount - a.useCount)
          .slice(0, limit);
      },

      clearAll: () => {
        set({ routes: [] });
      },
    }),
    {
      name: 'tomo-saved-routes',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
