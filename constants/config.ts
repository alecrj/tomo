/**
 * App Configuration
 * Reads from environment variables (EXPO_PUBLIC_* prefix for Expo)
 */

/**
 * Development location override
 * Set coordinates here to test specific cities in simulator
 * Set to null to use real GPS location
 */
const DEV_LOCATION_OVERRIDE = __DEV__ ? null : null;

// Example locations for testing:
// San Francisco: { latitude: 37.7749, longitude: -122.4194 }
// New York: { latitude: 40.7128, longitude: -74.0060 }
// London: { latitude: 51.5074, longitude: -0.1278 }
// Bangkok: { latitude: 13.7563, longitude: 100.5018 }
// Chiang Mai: { latitude: 18.7883, longitude: 98.9853 }
// Tokyo (Shibuya): { latitude: 35.6595, longitude: 139.7004 }

export const config = {
  // API Keys
  claudeApiKey: process.env.EXPO_PUBLIC_CLAUDE_API_KEY || '',
  weatherApiKey: process.env.EXPO_PUBLIC_WEATHER_API_KEY || '',
  googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',

  // OpenWeatherMap API
  weatherApiUrl: 'https://api.openweathermap.org/data/2.5/weather',

  // Development location override
  devLocationOverride: DEV_LOCATION_OVERRIDE,

  // Feature flags
  useMockWeather: !process.env.EXPO_PUBLIC_WEATHER_API_KEY,
  useMockLocation: false,
};
