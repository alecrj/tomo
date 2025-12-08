import { Coordinates, Weather, WeatherCondition } from '../types';
import { config } from '../constants/config';

/**
 * OpenWeatherMap API response type
 */
interface OpenWeatherResponse {
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  name: string;
}

/**
 * Map OpenWeatherMap condition to our WeatherCondition type
 */
function mapWeatherCondition(weatherMain: string): WeatherCondition {
  const main = weatherMain.toLowerCase();

  if (main.includes('clear')) return 'clear';
  if (main.includes('cloud')) return 'cloudy';
  if (main.includes('rain') || main.includes('drizzle')) return 'rain';
  if (main.includes('snow')) return 'snow';

  // Default to cloudy for unknown conditions
  return 'cloudy';
}

/**
 * Get mock weather data (used when no API key is available)
 */
function getMockWeather(): Weather {
  return {
    condition: 'clear',
    temperature: 23,
    humidity: 60,
    description: 'Clear sky',
  };
}

/**
 * Fetch weather data from OpenWeatherMap API
 */
export async function getWeather(
  coordinates: Coordinates
): Promise<Weather | null> {
  // Use mock data if no API key
  if (config.useMockWeather) {
    console.log('Using mock weather data (no API key configured)');
    return getMockWeather();
  }

  try {
    const { latitude, longitude } = coordinates;
    const url = `${config.weatherApiUrl}?lat=${latitude}&lon=${longitude}&units=metric&appid=${config.weatherApiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: OpenWeatherResponse = await response.json();

    // Map API response to our Weather type
    const weather: Weather = {
      condition: mapWeatherCondition(data.weather[0].main),
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0].description,
    };

    return weather;
  } catch (error) {
    console.error('Error fetching weather:', error);
    // Fall back to mock data on error
    return getMockWeather();
  }
}

/**
 * Get weather description text for UI
 */
export function getWeatherDescription(weather: Weather): string {
  const temp = `${weather.temperature}°C`;
  const desc = weather.description.charAt(0).toUpperCase() + weather.description.slice(1);
  return `${desc}, ${temp}`;
}
