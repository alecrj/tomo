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

// === FORECAST API ===

/**
 * OpenWeatherMap 5-day forecast response type
 */
interface OpenWeatherForecastResponse {
  list: Array<{
    dt: number; // Unix timestamp
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    pop: number; // Probability of precipitation (0-1)
    rain?: { '3h'?: number }; // Rain volume for last 3 hours
    snow?: { '3h'?: number }; // Snow volume for last 3 hours
  }>;
  city: {
    name: string;
    country: string;
    sunrise: number;
    sunset: number;
  };
}

/**
 * Daily forecast data
 */
export interface DailyForecast {
  date: number;         // Unix timestamp (start of day)
  dayOfWeek: string;    // "Mon", "Tue", etc.
  high: number;         // High temperature in Celsius
  low: number;          // Low temperature in Celsius
  condition: WeatherCondition;
  description: string;
  icon: string;         // OpenWeatherMap icon code
  precipitation: number; // Probability 0-100
  humidity: number;
}

/**
 * Full forecast result
 */
export interface ForecastResult {
  city: string;
  country: string;
  daily: DailyForecast[];
}

/**
 * Get mock forecast data
 */
function getMockForecast(): ForecastResult {
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daily: DailyForecast[] = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    daily.push({
      date: date.getTime(),
      dayOfWeek: i === 0 ? 'Today' : dayNames[date.getDay()],
      high: 24 + Math.floor(Math.random() * 4),
      low: 18 + Math.floor(Math.random() * 3),
      condition: i === 2 ? 'rain' : 'clear',
      description: i === 2 ? 'Light rain' : 'Clear sky',
      icon: i === 2 ? '10d' : '01d',
      precipitation: i === 2 ? 60 : 10,
      humidity: 55 + Math.floor(Math.random() * 15),
    });
  }

  return {
    city: 'Tokyo',
    country: 'JP',
    daily,
  };
}

/**
 * Fetch 5-day weather forecast from OpenWeatherMap API
 */
export async function getForecast(
  coordinates: Coordinates,
  days: number = 5
): Promise<ForecastResult | null> {
  // Use mock data if no API key
  if (config.useMockWeather) {
    return getMockForecast();
  }

  try {
    const { latitude, longitude } = coordinates;
    // OpenWeatherMap 5 day / 3 hour forecast endpoint
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${config.weatherApiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: OpenWeatherForecastResponse = await response.json();

    // Group forecast data by day
    const dailyMap = new Map<string, {
      temps: number[];
      conditions: string[];
      descriptions: string[];
      icons: string[];
      precipitation: number[];
      humidity: number[];
    }>();

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const item of data.list) {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toDateString();

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          temps: [],
          conditions: [],
          descriptions: [],
          icons: [],
          precipitation: [],
          humidity: [],
        });
      }

      const dayData = dailyMap.get(dateKey)!;
      dayData.temps.push(item.main.temp);
      dayData.conditions.push(item.weather[0].main);
      dayData.descriptions.push(item.weather[0].description);
      dayData.icons.push(item.weather[0].icon);
      dayData.precipitation.push(item.pop * 100);
      dayData.humidity.push(item.main.humidity);
    }

    // Convert map to daily forecast array
    const daily: DailyForecast[] = [];
    let dayIndex = 0;

    for (const [dateKey, dayData] of dailyMap) {
      if (dayIndex >= days) break;

      const date = new Date(dateKey);
      date.setHours(0, 0, 0, 0);

      // Find most common condition (mode)
      const conditionCounts = dayData.conditions.reduce((acc, cond) => {
        acc[cond] = (acc[cond] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mainCondition = Object.entries(conditionCounts)
        .sort((a, b) => b[1] - a[1])[0][0];

      // Get most common icon (prefer daytime icons)
      const daytimeIcons = dayData.icons.filter((icon) => icon.endsWith('d'));
      const mainIcon = daytimeIcons.length > 0 ? daytimeIcons[0] : dayData.icons[0];

      // Get most common description
      const descCounts = dayData.descriptions.reduce((acc, desc) => {
        acc[desc] = (acc[desc] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mainDescription = Object.entries(descCounts)
        .sort((a, b) => b[1] - a[1])[0][0];

      daily.push({
        date: date.getTime(),
        dayOfWeek: date.toDateString() === today.toDateString() ? 'Today' : dayNames[date.getDay()],
        high: Math.round(Math.max(...dayData.temps)),
        low: Math.round(Math.min(...dayData.temps)),
        condition: mapWeatherCondition(mainCondition),
        description: mainDescription.charAt(0).toUpperCase() + mainDescription.slice(1),
        icon: mainIcon,
        precipitation: Math.round(Math.max(...dayData.precipitation)),
        humidity: Math.round(dayData.humidity.reduce((a, b) => a + b) / dayData.humidity.length),
      });

      dayIndex++;
    }

    const result: ForecastResult = {
      city: data.city.name,
      country: data.city.country,
      daily,
    };

    return result;
  } catch (error) {
    // Fall back to mock data on error
    return getMockForecast();
  }
}

/**
 * Get weather icon component name based on condition
 */
export function getWeatherIconName(condition: WeatherCondition): string {
  switch (condition) {
    case 'clear':
      return 'Sun';
    case 'cloudy':
      return 'Cloud';
    case 'rain':
      return 'CloudRain';
    case 'snow':
      return 'CloudSnow';
    default:
      return 'Cloud';
  }
}
