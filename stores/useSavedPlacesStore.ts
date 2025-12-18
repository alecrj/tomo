import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaceCardData, Coordinates } from '../types';

export interface SavedPlace extends PlaceCardData {
  savedAt: number;
  city?: string;
  country?: string;
  notes?: string;
  visited?: boolean;
  visitedAt?: number;
}

interface SavedPlacesState {
  places: SavedPlace[];

  // Actions
  savePlace: (place: PlaceCardData, city?: string, country?: string) => void;
  removePlace: (placeId: string) => void;
  updatePlace: (placeId: string, updates: Partial<SavedPlace>) => void;
  markVisited: (placeId: string) => void;
  addNote: (placeId: string, note: string) => void;

  // Queries
  isPlaceSaved: (name: string, coordinates: Coordinates) => boolean;
  getPlacesByCity: (city: string) => SavedPlace[];
  getRecentlyAdded: (limit?: number) => SavedPlace[];
  getNearbyPlaces: (coordinates: Coordinates, radiusKm?: number) => SavedPlace[];

  // Clear
  clearAll: () => void;
}

// Helper to calculate distance between two coordinates (Haversine formula)
function getDistanceKm(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

const initialState = {
  places: [] as SavedPlace[],
};

export const useSavedPlacesStore = create<SavedPlacesState>()(
  persist(
    (set, get) => ({
      ...initialState,

      savePlace: (place, city, country) => {
        // Check if place already exists
        if (get().isPlaceSaved(place.name, place.coordinates)) {
          console.log('[SavedPlaces] Place already saved:', place.name);
          return;
        }

        const savedPlace: SavedPlace = {
          ...place,
          placeId: place.placeId || `saved-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          savedAt: Date.now(),
          city,
          country,
          visited: false,
        };

        set((state) => ({
          places: [savedPlace, ...state.places],
        }));

        console.log('[SavedPlaces] Saved:', place.name);
      },

      removePlace: (placeId) => {
        set((state) => ({
          places: state.places.filter((p) => p.placeId !== placeId),
        }));
        console.log('[SavedPlaces] Removed:', placeId);
      },

      updatePlace: (placeId, updates) => {
        set((state) => ({
          places: state.places.map((p) =>
            p.placeId === placeId ? { ...p, ...updates } : p
          ),
        }));
      },

      markVisited: (placeId) => {
        set((state) => ({
          places: state.places.map((p) =>
            p.placeId === placeId
              ? { ...p, visited: true, visitedAt: Date.now() }
              : p
          ),
        }));
        console.log('[SavedPlaces] Marked visited:', placeId);
      },

      addNote: (placeId, note) => {
        set((state) => ({
          places: state.places.map((p) =>
            p.placeId === placeId ? { ...p, notes: note } : p
          ),
        }));
      },

      isPlaceSaved: (name, coordinates) => {
        return get().places.some((p) => {
          // Check by name or coordinates proximity
          if (p.name.toLowerCase() === name.toLowerCase()) return true;
          const distance = getDistanceKm(p.coordinates, coordinates);
          return distance < 0.05; // Within 50 meters
        });
      },

      getPlacesByCity: (city) => {
        return get().places.filter(
          (p) => p.city?.toLowerCase() === city.toLowerCase()
        );
      },

      getRecentlyAdded: (limit = 10) => {
        return get()
          .places.slice()
          .sort((a, b) => b.savedAt - a.savedAt)
          .slice(0, limit);
      },

      getNearbyPlaces: (coordinates, radiusKm = 5) => {
        return get().places.filter((p) => {
          const distance = getDistanceKm(p.coordinates, coordinates);
          return distance <= radiusKm;
        });
      },

      clearAll: () => {
        set({ places: [] });
        console.log('[SavedPlaces] Cleared all saved places');
      },
    }),
    {
      name: 'tomo-saved-places-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
