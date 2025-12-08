import { create } from 'zustand';
import { Coordinates, Station } from '../types';

interface LocationState {
  coordinates: Coordinates | null;
  nearestStation: Station | null;
  neighborhood: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  setCoordinates: (coordinates: Coordinates) => void;
  setNearestStation: (station: Station) => void;
  setNeighborhood: (neighborhood: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  coordinates: null,
  nearestStation: null,
  neighborhood: null,
  loading: false,
  error: null,
};

export const useLocationStore = create<LocationState>((set) => ({
  ...initialState,

  setCoordinates: (coordinates) => set({ coordinates }),
  setNearestStation: (station) => set({ nearestStation: station }),
  setNeighborhood: (neighborhood) => set({ neighborhood }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
