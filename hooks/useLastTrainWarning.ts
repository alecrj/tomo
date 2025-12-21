import { useEffect, useCallback, useRef } from 'react';
import { useNavigationStore } from '../stores/useNavigationStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { getTransitDirections } from '../services/routes';
import { getMinutesUntilLastTrain } from '../services/routes';

// Check interval in milliseconds (every 5 minutes)
const CHECK_INTERVAL = 5 * 60 * 1000;

/**
 * Hook to monitor and warn about last train times
 * Runs periodic checks when user is navigating or has a home base set
 */
export function useLastTrainWarning() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWarningRef = useRef<number>(0);

  // Store selectors
  const coordinates = useLocationStore((state) => state.coordinates);
  const homeBase = usePreferencesStore((state) => state.homeBase);
  const currentRoute = useNavigationStore((state) => state.currentRoute);
  const mode = useNavigationStore((state) => state.mode);

  // Notification store
  const createLastTrainWarning = useNotificationStore(
    (state) => state.createLastTrainWarning
  );
  const lastTrainWarningMinutes = useNotificationStore(
    (state) => state.lastTrainWarningMinutes
  );
  const dismissAllOfType = useNotificationStore((state) => state.dismissAllOfType);

  /**
   * Check if we need to warn about last train
   */
  const checkLastTrain = useCallback(async () => {
    // Don't check if no home base or no coordinates
    if (!homeBase || !coordinates) return;

    // Don't warn too frequently (minimum 10 minutes between warnings)
    const now = Date.now();
    if (now - lastWarningRef.current < 10 * 60 * 1000) return;

    try {
      // Get transit route home
      const routeHome = await getTransitDirections(
        coordinates,
        homeBase.coordinates
      );

      if (!routeHome) return;

      // Check minutes until last train
      const minutesUntilLast = getMinutesUntilLastTrain(routeHome);

      if (minutesUntilLast !== null && minutesUntilLast <= lastTrainWarningMinutes) {
        // Determine train line from route
        const transitStep = routeHome.steps.find(
          (s) => s.mode === 'train' || s.mode === 'bus'
        );
        const trainLine = transitStep?.line || 'train';

        // Create warning
        createLastTrainWarning(
          minutesUntilLast,
          trainLine,
          homeBase.name,
          homeBase.coordinates
        );

        lastWarningRef.current = now;
      }
    } catch (error) {
      // Silently handle last train check errors
    }
  }, [coordinates, homeBase, lastTrainWarningMinutes, createLastTrainWarning]);

  /**
   * Check current route for last train
   */
  const checkCurrentRoute = useCallback(() => {
    if (!currentRoute || mode !== 'navigating') return;

    const minutesUntilLast = getMinutesUntilLastTrain(currentRoute);

    if (minutesUntilLast !== null && minutesUntilLast <= lastTrainWarningMinutes) {
      const transitStep = currentRoute.steps.find(
        (s) => s.mode === 'train' || s.mode === 'bus'
      );
      const trainLine = transitStep?.line || 'transit';

      // Don't duplicate warnings
      const now = Date.now();
      if (now - lastWarningRef.current < 10 * 60 * 1000) return;

      createLastTrainWarning(
        minutesUntilLast,
        trainLine,
        'your destination',
        undefined
      );

      lastWarningRef.current = now;
    }
  }, [currentRoute, mode, lastTrainWarningMinutes, createLastTrainWarning]);

  // Check last train periodically
  useEffect(() => {
    // Only run if we have coordinates and home base
    if (!coordinates || !homeBase) return;

    // Initial check
    checkLastTrain();

    // Set up interval
    intervalRef.current = setInterval(checkLastTrain, CHECK_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [coordinates, homeBase, checkLastTrain]);

  // Check current route when navigating
  useEffect(() => {
    if (mode === 'navigating' && currentRoute) {
      checkCurrentRoute();
    }
  }, [mode, currentRoute, checkCurrentRoute]);

  // Dismiss last train warnings when user arrives home
  useEffect(() => {
    if (mode === 'idle' && lastWarningRef.current > 0) {
      // Reset warning tracker when back to idle
      lastWarningRef.current = 0;
    }
  }, [mode]);

  return {
    checkLastTrain,
    checkCurrentRoute,
  };
}
