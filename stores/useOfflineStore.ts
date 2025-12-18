import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaceCardData, TransitRoute, Coordinates } from '../types';

interface CachedPlace {
  data: PlaceCardData;
  timestamp: number;
  expiresAt: number;
}

interface CachedRoute {
  origin: Coordinates;
  destination: Coordinates;
  mode: 'WALK' | 'TRANSIT' | 'DRIVE';
  route: TransitRoute;
  timestamp: number;
  expiresAt: number;
}

interface QueuedMessage {
  id: string;
  content: string;
  timestamp: number;
  image?: string;
}

interface OfflineStoreState {
  // Network state
  isOnline: boolean;
  lastOnlineAt: number | null;

  // Cached data
  cachedPlaces: Record<string, CachedPlace>;
  cachedRoutes: CachedRoute[];

  // Message queue for offline messages
  messageQueue: QueuedMessage[];

  // Actions
  setOnline: (online: boolean) => void;
  checkNetworkStatus: () => Promise<boolean>;

  // Place caching
  cachePlace: (placeId: string, place: PlaceCardData) => void;
  getCachedPlace: (placeId: string) => PlaceCardData | null;
  clearExpiredPlaces: () => void;

  // Route caching
  cacheRoute: (origin: Coordinates, destination: Coordinates, mode: 'WALK' | 'TRANSIT' | 'DRIVE', route: TransitRoute) => void;
  getCachedRoute: (origin: Coordinates, destination: Coordinates, mode: 'WALK' | 'TRANSIT' | 'DRIVE') => TransitRoute | null;
  clearExpiredRoutes: () => void;

  // Message queue
  queueMessage: (content: string, image?: string) => void;
  getQueuedMessages: () => QueuedMessage[];
  clearMessageQueue: () => void;
  removeFromQueue: (id: string) => void;

  // Clear all
  clearAll: () => void;
}

// Cache expiration times
const PLACE_CACHE_HOURS = 24; // 24 hours
const ROUTE_CACHE_HOURS = 1; // 1 hour

// Helper to check if two coordinates are close enough
const coordsMatch = (a: Coordinates, b: Coordinates, threshold = 0.001): boolean => {
  return Math.abs(a.latitude - b.latitude) < threshold && Math.abs(a.longitude - b.longitude) < threshold;
};

const initialState = {
  isOnline: true,
  lastOnlineAt: null as number | null,
  cachedPlaces: {} as Record<string, CachedPlace>,
  cachedRoutes: [] as CachedRoute[],
  messageQueue: [] as QueuedMessage[],
};

export const useOfflineStore = create<OfflineStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOnline: (online) => {
        set({
          isOnline: online,
          lastOnlineAt: online ? Date.now() : get().lastOnlineAt,
        });
        console.log('[Offline] Network status:', online ? 'online' : 'offline');
      },

      checkNetworkStatus: async () => {
        try {
          // Simple connectivity check via fetch
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const response = await fetch('https://www.google.com/generate_204', {
            method: 'HEAD',
            signal: controller.signal,
          });

          clearTimeout(timeout);
          const isOnline = response.ok;
          get().setOnline(isOnline);
          return isOnline;
        } catch (error) {
          console.error('[Offline] Error checking network:', error);
          get().setOnline(false);
          return false;
        }
      },

      // === PLACE CACHING ===

      cachePlace: (placeId, place) => {
        const now = Date.now();
        const expiresAt = now + PLACE_CACHE_HOURS * 60 * 60 * 1000;

        set((state) => ({
          cachedPlaces: {
            ...state.cachedPlaces,
            [placeId]: {
              data: place,
              timestamp: now,
              expiresAt,
            },
          },
        }));
        console.log('[Offline] Cached place:', place.name);
      },

      getCachedPlace: (placeId) => {
        const cached = get().cachedPlaces[placeId];
        if (!cached) return null;

        // Check if expired
        if (cached.expiresAt < Date.now()) {
          // Remove expired cache
          set((state) => {
            const { [placeId]: _, ...rest } = state.cachedPlaces;
            return { cachedPlaces: rest };
          });
          return null;
        }

        return cached.data;
      },

      clearExpiredPlaces: () => {
        const now = Date.now();
        set((state) => {
          const validPlaces: Record<string, CachedPlace> = {};
          Object.entries(state.cachedPlaces).forEach(([id, cached]) => {
            if (cached.expiresAt > now) {
              validPlaces[id] = cached;
            }
          });
          return { cachedPlaces: validPlaces };
        });
      },

      // === ROUTE CACHING ===

      cacheRoute: (origin, destination, mode, route) => {
        const now = Date.now();
        const expiresAt = now + ROUTE_CACHE_HOURS * 60 * 60 * 1000;

        set((state) => {
          // Remove any existing matching route
          const filteredRoutes = state.cachedRoutes.filter(
            (r) => !(coordsMatch(r.origin, origin) && coordsMatch(r.destination, destination) && r.mode === mode)
          );

          return {
            cachedRoutes: [
              ...filteredRoutes,
              {
                origin,
                destination,
                mode,
                route,
                timestamp: now,
                expiresAt,
              },
            ],
          };
        });
        console.log('[Offline] Cached route:', mode);
      },

      getCachedRoute: (origin, destination, mode) => {
        const cached = get().cachedRoutes.find(
          (r) => coordsMatch(r.origin, origin) && coordsMatch(r.destination, destination) && r.mode === mode
        );

        if (!cached) return null;

        // Check if expired
        if (cached.expiresAt < Date.now()) {
          // Remove expired route
          set((state) => ({
            cachedRoutes: state.cachedRoutes.filter((r) => r !== cached),
          }));
          return null;
        }

        return cached.route;
      },

      clearExpiredRoutes: () => {
        const now = Date.now();
        set((state) => ({
          cachedRoutes: state.cachedRoutes.filter((r) => r.expiresAt > now),
        }));
      },

      // === MESSAGE QUEUE ===

      queueMessage: (content, image) => {
        const message: QueuedMessage = {
          id: `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          timestamp: Date.now(),
          image,
        };

        set((state) => ({
          messageQueue: [...state.messageQueue, message],
        }));
        console.log('[Offline] Message queued:', content.substring(0, 30));
      },

      getQueuedMessages: () => {
        return get().messageQueue;
      },

      clearMessageQueue: () => {
        set({ messageQueue: [] });
        console.log('[Offline] Message queue cleared');
      },

      removeFromQueue: (id) => {
        set((state) => ({
          messageQueue: state.messageQueue.filter((m) => m.id !== id),
        }));
      },

      clearAll: () => {
        set(initialState);
        console.log('[Offline] All offline data cleared');
      },
    }),
    {
      name: 'tomo-offline-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Initialize network listener via periodic check
export function initNetworkListener() {
  // Check network status periodically
  const checkInterval = setInterval(() => {
    useOfflineStore.getState().checkNetworkStatus();
  }, 30000); // Check every 30 seconds

  // Initial check
  useOfflineStore.getState().checkNetworkStatus();

  return () => clearInterval(checkInterval);
}
