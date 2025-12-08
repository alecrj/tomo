import { useEffect, useCallback } from 'react';
import { useLocationStore } from '../stores/useLocationStore';
import { useStampsStore } from '../stores/useStampsStore';
import {
  getCurrentLocation,
  watchLocation,
  getNearestStation,
  detectCity,
  getNeighborhoodName,
} from '../services/location';

/**
 * Hook to manage location tracking and updates
 * Automatically requests permission, gets location, and watches for changes
 */
export function useLocation() {
  const location = useLocationStore((state) => ({
    coordinates: state.coordinates,
    nearestStation: state.nearestStation,
    neighborhood: state.neighborhood,
  }));
  const loading = useLocationStore((state) => state.loading);
  const error = useLocationStore((state) => state.error);

  const setCoordinates = useLocationStore((state) => state.setCoordinates);
  const setNearestStation = useLocationStore((state) => state.setNearestStation);
  const setNeighborhood = useLocationStore((state) => state.setNeighborhood);
  const setLoading = useLocationStore((state) => state.setLoading);
  const setError = useLocationStore((state) => state.setError);

  /**
   * Fetch and update location data
   */
  const updateLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current coordinates
      const coords = await getCurrentLocation();
      if (!coords) {
        throw new Error('Failed to get location');
      }

      setCoordinates(coords);

      // Detect city
      const city = detectCity(coords);

      // Get nearest station
      const station = await getNearestStation(coords);
      if (station) {
        setNearestStation(station);
        const neighborhood = getNeighborhoodName(station);
        if (neighborhood) {
          setNeighborhood(neighborhood);
        }
      }

      // Load stamps for detected city
      if (city) {
        const stampsStore = useStampsStore.getState();
        if (stampsStore.currentCity !== city) {
          stampsStore.loadStampsForCity(city);
        }
      }

      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setLoading(false);
      console.error('Location error:', err);
    }
  }, [setCoordinates, setNearestStation, setNeighborhood, setLoading, setError]);

  /**
   * Refresh location manually
   */
  const refresh = useCallback(() => {
    updateLocation();
  }, [updateLocation]);

  /**
   * Initialize location tracking on mount
   */
  useEffect(() => {
    // Get initial location
    updateLocation();

    // Start watching location
    let unsubscribe: (() => void) | null = null;

    watchLocation((coords) => {
      setCoordinates(coords);

      // Update station and neighborhood when location changes significantly
      getNearestStation(coords).then((station) => {
        if (station) {
          setNearestStation(station);
          const neighborhood = getNeighborhoodName(station);
          if (neighborhood) {
            setNeighborhood(neighborhood);
          }
        }
      });

      // Check if city changed
      const city = detectCity(coords);
      if (city) {
        const stampsStore = useStampsStore.getState();
        if (stampsStore.currentCity !== city) {
          stampsStore.loadStampsForCity(city);
        }
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [updateLocation, setCoordinates, setNearestStation, setNeighborhood]);

  return {
    location,
    loading,
    error,
    refresh,
  };
}
