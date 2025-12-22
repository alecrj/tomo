// Dynamic Expo config - reads API keys from environment variables
// This prevents secrets from being committed to git

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!googleMapsApiKey) {
    console.warn(
      'Warning: EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is not set. Google Maps will not work.'
    );
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        googleMapsApiKey: googleMapsApiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    plugins: [
      'expo-router',
      'expo-location',
      'expo-build-properties',
      // Note: react-native-maps v1.19.1 doesn't have a config plugin
      // Google Maps API key is configured in AppDelegate.swift
    ],
  };
};
