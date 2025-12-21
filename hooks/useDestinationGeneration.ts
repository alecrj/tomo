import { useCallback, useEffect } from 'react';
import { useLocationStore } from '../stores/useLocationStore';
import { useWeatherStore } from '../stores/useWeatherStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useTripStore } from '../stores/useTripStore';
import { useStampsStore } from '../stores/useStampsStore';
import { useDestinationsStore } from '../stores/useDestinationsStore';
import { useTimeOfDay } from './useTimeOfDay';
import { generateDestination } from '../services/claude';
import { DestinationContext } from '../types';

/**
 * Hook to generate contextual destinations using Claude
 */
export function useDestinationGeneration() {
  const timeOfDay = useTimeOfDay();

  // Store selectors - use individual selectors to avoid creating new objects
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);
  const dailyBudget = useBudgetStore((state) => state.dailyBudget);
  const spentToday = useBudgetStore((state) => state.spentToday());
  const remainingToday = useBudgetStore((state) => state.remainingToday());

  // Individual preference selectors
  const homeBase = usePreferencesStore((state) => state.homeBase);
  const walkingTolerance = usePreferencesStore((state) => state.walkingTolerance);
  const budgetLevel = usePreferencesStore((state) => state.budgetLevel);
  const dietary = usePreferencesStore((state) => state.dietary);
  const interests = usePreferencesStore((state) => state.interests);
  const avoidCrowds = usePreferencesStore((state) => state.avoidCrowds);

  const visits = useTripStore((state) => state.visits);
  const totalWalkingMinutes = useTripStore((state) => state.totalWalkingMinutes);
  const stamps = useStampsStore((state) => state.stamps);
  const excludedToday = useDestinationsStore((state) => state.excludedTodayIds);
  const setDestination = useDestinationsStore((state) => state.setDestination);
  const setLoading = useDestinationsStore((state) => state.setLoading);
  const currentDestination = useDestinationsStore((state) => state.currentDestination);

  /**
   * Build context for Claude
   */
  const buildContext = useCallback((): DestinationContext | null => {
    if (!coordinates) {
      return null;
    }

    const weather = weatherCondition && weatherTemperature ? {
      condition: weatherCondition,
      temperature: weatherTemperature,
      humidity: 60, // Default value
      description: weatherCondition,
    } : null;

    // Compute completed stamps here to avoid creating new arrays on every render
    const completedStamps = stamps.filter((s) => s.completed).map((s) => s.id);

    return {
      location: coordinates,
      neighborhood,
      timeOfDay,
      weather,
      budgetRemaining: remainingToday,
      dailyBudget,
      preferences: {
        homeBase,
        walkingTolerance: (walkingTolerance === 'medium' ? 'moderate' : walkingTolerance) as 'low' | 'moderate' | 'high',
        budget: budgetLevel,
        dietary,
        interests,
        avoidCrowds,
      },
      visitedPlaces: visits,
      completedStamps,
      excludedToday,
      totalWalkingToday: totalWalkingMinutes,
    };
  }, [
    coordinates,
    neighborhood,
    timeOfDay,
    weatherCondition,
    weatherTemperature,
    remainingToday,
    dailyBudget,
    homeBase,
    walkingTolerance,
    budgetLevel,
    dietary,
    interests,
    avoidCrowds,
    visits,
    stamps,
    excludedToday,
    totalWalkingMinutes,
  ]);

  /**
   * Generate a new destination
   */
  const generate = useCallback(async () => {
    const context = buildContext();
    if (!context) {
      return;
    }

    try {
      setLoading(true);
      const destination = await generateDestination(context);

      if (destination) {
        setDestination(destination);
      }
    } catch (error) {
      // Silently handle destination generation errors
    } finally {
      setLoading(false);
    }
  }, [buildContext, setDestination, setLoading]);

  /**
   * Generate initial destination on mount (if no destination exists)
   */
  useEffect(() => {
    if (!currentDestination && coordinates) {
      generate();
    }
  }, [currentDestination, coordinates]);

  /**
   * Regenerate function (for "Something else" button)
   */
  const regenerate = useCallback(() => {
    generate();
  }, [generate]);

  return {
    generate,
    regenerate,
  };
}
