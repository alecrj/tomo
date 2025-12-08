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

  // Store selectors
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);
  const dailyBudget = useBudgetStore((state) => state.dailyBudget);
  const spentToday = useBudgetStore((state) => state.spentToday());
  const remainingToday = useBudgetStore((state) => state.remainingToday());
  const userPreferences = usePreferencesStore((state) => ({
    homeBase: state.homeBase,
    walkingTolerance: (state.walkingTolerance === 'medium' ? 'moderate' : state.walkingTolerance) as 'low' | 'moderate' | 'high',
    budget: state.budgetLevel,
    dietary: state.dietary,
    interests: state.interests,
    avoidCrowds: state.avoidCrowds,
  }));
  const visits = useTripStore((state) => state.visits);
  const totalWalkingMinutes = useTripStore((state) => state.totalWalkingMinutes);
  const completedStamps = useStampsStore((state) =>
    state.stamps.filter((s) => s.completed).map((s) => s.id)
  );
  const excludedToday = useDestinationsStore((state) => state.excludedTodayIds);
  const setDestination = useDestinationsStore((state) => state.setDestination);
  const setLoading = useDestinationsStore((state) => state.setLoading);
  const currentDestination = useDestinationsStore((state) => state.currentDestination);

  /**
   * Build context for Claude
   */
  const buildContext = useCallback((): DestinationContext | null => {
    if (!coordinates) {
      console.log('No coordinates available yet');
      return null;
    }

    const weather = weatherCondition && weatherTemperature ? {
      condition: weatherCondition,
      temperature: weatherTemperature,
      humidity: 60, // Default value
      description: weatherCondition,
    } : null;

    return {
      location: coordinates,
      neighborhood,
      timeOfDay,
      weather,
      budgetRemaining: remainingToday,
      dailyBudget,
      preferences: userPreferences,
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
    userPreferences,
    visits,
    completedStamps,
    excludedToday,
    totalWalkingMinutes,
  ]);

  /**
   * Generate a new destination
   */
  const generate = useCallback(async () => {
    const context = buildContext();
    if (!context) {
      console.log('Cannot generate destination: missing context');
      return;
    }

    try {
      setLoading(true);
      console.log('Generating destination with context:', {
        location: context.neighborhood,
        timeOfDay: context.timeOfDay,
        weather: context.weather?.condition,
        budgetRemaining: context.budgetRemaining,
        excludedCount: context.excludedToday.length,
      });

      const destination = await generateDestination(context);

      if (destination) {
        console.log('Destination generated:', destination.title);
        setDestination(destination);
      } else {
        console.error('Failed to generate destination');
      }
    } catch (error) {
      console.error('Error generating destination:', error);
    } finally {
      setLoading(false);
    }
  }, [buildContext, setDestination, setLoading]);

  /**
   * Generate initial destination on mount (if no destination exists)
   */
  useEffect(() => {
    if (!currentDestination && coordinates) {
      console.log('No destination exists, generating initial destination...');
      generate();
    }
  }, [currentDestination, coordinates]); // Only run when these change

  /**
   * Regenerate function (for "Something else" button)
   */
  const regenerate = useCallback(() => {
    console.log('Regenerating destination...');
    generate();
  }, [generate]);

  return {
    generate,
    regenerate,
  };
}
