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
    plugins: [
      'expo-router',
      'expo-location',
      // Note: react-native-maps 1.19.1 doesn't need a plugin, but we need to configure
      // Google Maps manually in ios/Podfile and provide API key via environment
    ],
  };
};
