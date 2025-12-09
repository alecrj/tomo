import { useEffect } from 'react';
import { useLocationStore } from '../stores/useLocationStore';
import { useWeatherStore } from '../stores/useWeatherStore';
import { getWeather } from '../services/weather';

/**
 * Hook to manage weather updates based on location
 * Automatically fetches weather when coordinates change
 */
export function useWeather() {
  const coordinates = useLocationStore((state) => state.coordinates);
  // Use individual selectors to avoid creating new objects on every render
  const condition = useWeatherStore((state) => state.condition);
  const temperature = useWeatherStore((state) => state.temperature);
  const loading = useWeatherStore((state) => state.loading);

  const setWeather = useWeatherStore((state) => state.setWeather);
  const setLoading = useWeatherStore((state) => state.setLoading);

  /**
   * Fetch weather when location changes
   */
  useEffect(() => {
    if (!coordinates) return;

    const fetchWeather = async () => {
      try {
        setLoading(true);

        const weatherData = await getWeather(coordinates);

        if (weatherData) {
          setWeather(weatherData.condition, weatherData.temperature);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching weather:', error);
        setLoading(false);
      }
    };

    fetchWeather();

    // Refresh weather every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [coordinates, setWeather, setLoading]);

  return {
    weather: {
      condition,
      temperature,
    },
    loading,
  };
}
