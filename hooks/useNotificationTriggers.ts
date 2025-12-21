import { useEffect, useRef, useCallback } from 'react';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useWeatherStore } from '../stores/useWeatherStore';
import { useItineraryStore } from '../stores/useItineraryStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useLocationStore } from '../stores/useLocationStore';
import type { WeatherCondition, Activity } from '../types';

// Check interval in milliseconds (30 seconds)
const CHECK_INTERVAL = 30000;

// Track what we've already notified about to avoid duplicates
interface NotificationTracker {
  lastBudgetWarningPercent: number | null;
  lastWeatherCondition: WeatherCondition | null;
  notifiedActivityIds: Set<string>;
  notifiedClosingPlaces: Set<string>;
  lastCleanup: number; // Timestamp of last cleanup to prevent memory leaks
}

/**
 * Hook that runs notification triggers in the background
 * Checks for:
 * - Budget threshold warnings
 * - Weather change alerts
 * - Itinerary activity reminders
 * - Place closing warnings
 */
export function useNotificationTriggers() {
  const trackerRef = useRef<NotificationTracker>({
    lastBudgetWarningPercent: null,
    lastWeatherCondition: null,
    notifiedActivityIds: new Set(),
    notifiedClosingPlaces: new Set(),
    lastCleanup: Date.now(),
  });

  /**
   * Cleanup old tracked notifications to prevent memory leaks
   * Runs daily or when Sets exceed 100 items
   */
  const cleanupTrackedNotifications = useCallback(() => {
    const tracker = trackerRef.current;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Clean up if it's been more than a day OR if Sets are too large
    const shouldCleanup =
      now - tracker.lastCleanup > oneDayMs ||
      tracker.notifiedActivityIds.size > 100 ||
      tracker.notifiedClosingPlaces.size > 100;

    if (shouldCleanup) {
      tracker.notifiedActivityIds.clear();
      tracker.notifiedClosingPlaces.clear();
      tracker.lastBudgetWarningPercent = null;
      tracker.lastCleanup = now;
    }
  }, []);

  // Notification store
  const {
    budgetWarningThreshold,
    placeClosingWarningMinutes,
    createBudgetWarning,
    createWeatherAlert,
    createPlaceClosingWarning,
    addNotification,
  } = useNotificationStore();

  // Preferences store
  const {
    budgetAlerts,
    weatherAlerts,
    placeClosingWarnings,
    itineraryReminders,
  } = usePreferencesStore();

  // Budget store
  const dailyBudget = useBudgetStore((state) => state.dailyBudget);
  const spentToday = useBudgetStore((state) => state.spentToday);

  // Weather store
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);

  // Itinerary store
  const getActiveItinerary = useItineraryStore((state) => state.getActiveItinerary);
  const getTodaysActivities = useItineraryStore((state) => state.getTodaysActivities);

  // Location store
  const neighborhood = useLocationStore((state) => state.neighborhood);

  /**
   * Check budget threshold and trigger warning if needed
   */
  const checkBudgetTrigger = useCallback(() => {
    if (!budgetAlerts || dailyBudget <= 0) return;

    const spent = spentToday();
    const percentUsed = (spent / dailyBudget) * 100;
    const tracker = trackerRef.current;

    // Trigger at warning threshold (80%), 100%, and every 20% over
    const warningThresholds = [budgetWarningThreshold, 100, 120, 140, 160];

    for (const threshold of warningThresholds) {
      if (percentUsed >= threshold && (tracker.lastBudgetWarningPercent === null || tracker.lastBudgetWarningPercent < threshold)) {
        const remaining = Math.max(0, dailyBudget - spent);
        createBudgetWarning(percentUsed, remaining, '$'); // TODO: Get actual currency
        tracker.lastBudgetWarningPercent = threshold;
        break;
      }
    }
  }, [budgetAlerts, dailyBudget, spentToday, budgetWarningThreshold, createBudgetWarning]);

  /**
   * Check for weather changes and trigger alerts
   */
  const checkWeatherTrigger = useCallback(() => {
    if (!weatherAlerts || !weatherCondition) return;

    const tracker = trackerRef.current;

    // Check if weather changed from clear/cloudy to rain/snow (significant change)
    const wasGood = tracker.lastWeatherCondition === 'clear' || tracker.lastWeatherCondition === 'cloudy';
    const isBad = weatherCondition === 'rain' || weatherCondition === 'snow';

    if (wasGood && isBad) {
      const description = weatherCondition === 'rain'
        ? `Rain expected${weatherTemperature ? ` (${weatherTemperature}°)` : ''}. Consider bringing an umbrella!`
        : `Snow expected${weatherTemperature ? ` (${weatherTemperature}°)` : ''}. Bundle up!`;

      createWeatherAlert(
        weatherCondition === 'rain' ? 'Rain Incoming' : 'Snow Incoming',
        description
      );
    }

    // Update tracker
    tracker.lastWeatherCondition = weatherCondition;
  }, [weatherAlerts, weatherCondition, weatherTemperature, createWeatherAlert]);

  /**
   * Check for upcoming itinerary activities and trigger reminders
   */
  const checkItineraryTrigger = useCallback(() => {
    if (!itineraryReminders) return;

    const activities = getTodaysActivities();
    if (activities.length === 0) return;

    const tracker = trackerRef.current;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Map time slots to approximate start hours
    const timeSlotHours: Record<string, number> = {
      'morning': 9,
      'afternoon': 13,
      'evening': 18,
      'night': 21,
    };

    for (const activity of activities) {
      // Skip if already notified or completed
      if (tracker.notifiedActivityIds.has(activity.id) || activity.booked) continue;

      // Calculate activity start time
      let activityHour: number;
      if (activity.startTime) {
        const [hours] = activity.startTime.split(':').map(Number);
        activityHour = hours;
      } else {
        activityHour = timeSlotHours[activity.timeSlot] || 12;
      }

      // Check if activity is starting within the next 30 minutes
      const currentTotalMinutes = currentHour * 60 + currentMinutes;
      const activityTotalMinutes = activityHour * 60;
      const minutesUntilActivity = activityTotalMinutes - currentTotalMinutes;

      if (minutesUntilActivity > 0 && minutesUntilActivity <= 30) {
        addNotification({
          type: 'itinerary',
          priority: 'info',
          title: `Coming up: ${activity.title}`,
          body: activity.place
            ? `${activity.description} at ${activity.place.name}`
            : activity.description,
          expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
          action: activity.place?.coordinates
            ? { type: 'navigate_to', payload: { coordinates: activity.place.coordinates } }
            : undefined,
          coordinates: activity.place?.coordinates,
        });
        tracker.notifiedActivityIds.add(activity.id);
      }
    }
  }, [itineraryReminders, getTodaysActivities, addNotification]);

  /**
   * Check for places closing soon in itinerary
   */
  const checkPlaceClosingTrigger = useCallback(() => {
    if (!placeClosingWarnings) return;

    const activities = getTodaysActivities();
    if (activities.length === 0) return;

    const tracker = trackerRef.current;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    for (const activity of activities) {
      // Skip if no place or already notified or completed
      if (!activity.place || tracker.notifiedClosingPlaces.has(activity.id) || activity.booked) continue;

      // Check if place has hours info
      const hours = activity.place.hours;
      if (!hours) continue;

      // Try to parse closing time from hours string (e.g., "9 AM - 10 PM")
      const closingMatch = hours.match(/(\d{1,2})\s*(am|pm)/i);
      if (!closingMatch) continue;

      let closingHour = parseInt(closingMatch[1]);
      const isPM = closingMatch[2].toLowerCase() === 'pm';
      if (isPM && closingHour !== 12) closingHour += 12;
      if (!isPM && closingHour === 12) closingHour = 0;

      // Calculate minutes until closing
      const currentTotalMinutes = currentHour * 60 + currentMinutes;
      const closingTotalMinutes = closingHour * 60;
      const minutesUntilClose = closingTotalMinutes - currentTotalMinutes;

      // Only warn if closing within the configured warning time and place is still open
      if (minutesUntilClose > 0 && minutesUntilClose <= placeClosingWarningMinutes && activity.place.openNow !== false) {
        createPlaceClosingWarning(
          activity.place.name,
          minutesUntilClose,
          activity.place.placeId,
          activity.place.coordinates
        );
        tracker.notifiedClosingPlaces.add(activity.id);
      }
    }
  }, [placeClosingWarnings, getTodaysActivities, placeClosingWarningMinutes, createPlaceClosingWarning]);

  /**
   * Run all triggers
   */
  const runAllTriggers = useCallback(() => {
    // First, cleanup old tracked data to prevent memory leaks
    cleanupTrackedNotifications();

    // Then run all checks
    checkBudgetTrigger();
    checkWeatherTrigger();
    checkItineraryTrigger();
    checkPlaceClosingTrigger();
  }, [cleanupTrackedNotifications, checkBudgetTrigger, checkWeatherTrigger, checkItineraryTrigger, checkPlaceClosingTrigger]);

  // Run triggers on mount and at interval
  useEffect(() => {
    // Initial check with slight delay to let stores hydrate
    const initialTimeout = setTimeout(() => {
      runAllTriggers();
    }, 2000);

    // Set up interval for periodic checks
    const interval = setInterval(runAllTriggers, CHECK_INTERVAL);


    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [runAllTriggers]);

  // Also run triggers when relevant data changes
  useEffect(() => {
    checkBudgetTrigger();
  }, [checkBudgetTrigger, spentToday]);

  useEffect(() => {
    checkWeatherTrigger();
  }, [checkWeatherTrigger, weatherCondition]);

  return {
    runAllTriggers,
    checkBudgetTrigger,
    checkWeatherTrigger,
    checkItineraryTrigger,
    checkPlaceClosingTrigger,
  };
}

export default useNotificationTriggers;
