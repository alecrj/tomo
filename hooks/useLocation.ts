import { useEffect, useCallback, useRef } from 'react';
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
  // Use individual selectors to avoid creating new objects on every render
  const coordinates = useLocationStore((state) => state.coordinates);
  const nearestStation = useLocationStore((state) => state.nearestStation);
  const neighborhood = useLocationStore((state) => state.neighborhood);
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
      }

      // Get actual neighborhood via reverse geocoding
      const neighborhood = await getNeighborhoodName(coords);
      if (neighborhood) {
        setNeighborhood(neighborhood);
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
    // Track if component is still mounted
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    // Get initial location
    updateLocation();

    // Start watching location
    const startWatching = async () => {
      try {
        const unsub = await watchLocation((coords) => {
          // Only update if still mounted
          if (!isMounted) return;

          setCoordinates(coords);

          // Update station and neighborhood when location changes significantly
          getNearestStation(coords).then((station) => {
            if (station && isMounted) {
              setNearestStation(station);
            }
          });

          // Update neighborhood via reverse geocoding
          getNeighborhoodName(coords).then((neighborhood) => {
            if (neighborhood && isMounted) {
              setNeighborhood(neighborhood);
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
        });

        // Store unsubscribe for cleanup
        if (isMounted) {
          unsubscribe = unsub;
        } else if (unsub) {
          // Component unmounted before watch started, clean up immediately
          unsub();
        }
      } catch (error) {
        console.warn('[useLocation] Failed to start watching:', error);
      }
    };

    startWatching();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [updateLocation, setCoordinates, setNearestStation, setNeighborhood]);

  return {
    location: {
      coordinates,
      nearestStation,
      neighborhood,
    },
    loading,
    error,
    refresh,
  };
}
