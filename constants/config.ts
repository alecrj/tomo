/**
 * App Configuration
 * Reads from environment variables (EXPO_PUBLIC_* prefix for Expo)
 */

export const config = {
  // API Keys
  claudeApiKey: process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '',
  weatherApiKey: process.env.EXPO_PUBLIC_WEATHER_API_KEY || '',
  googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',

  // OpenWeatherMap API
  weatherApiUrl: 'https://api.openweathermap.org/data/2.5/weather',

  // Feature flags
  useMockWeather: !process.env.EXPO_PUBLIC_WEATHER_API_KEY,
  useMockLocation: false,
};
