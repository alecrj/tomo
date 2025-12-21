import * as Location from 'expo-location';
import { Coordinates, Station } from '../types';
import { config } from '../constants/config';

/**
 * Request location permissions
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Get current GPS coordinates
 * In development mode, can use devLocationOverride from config for testing
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    // Use dev override if set (for testing in simulator)
    if (config.devLocationOverride) {
      return config.devLocationOverride;
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Subscribe to location updates
 * Returns an unsubscribe function
 */
export async function watchLocation(
  callback: (coordinates: Coordinates) => void
): Promise<(() => void) | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 100, // Or when moved 100 meters
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    );

    return () => subscription.remove();
  } catch (error) {
    console.error('Error watching location:', error);
    return null;
  }
}

/**
 * Detect city from coordinates using bounding boxes
 * Currently supports: Tokyo, Osaka, Chiang Mai
 */
export function detectCity(coordinates: Coordinates): string | null {
  const { latitude, longitude } = coordinates;

  // Tokyo bounding box (rough approximation)
  if (
    latitude >= 35.5 &&
    latitude <= 35.9 &&
    longitude >= 139.5 &&
    longitude <= 140.0
  ) {
    return 'tokyo';
  }

  // Osaka bounding box
  if (
    latitude >= 34.5 &&
    latitude <= 34.8 &&
    longitude >= 135.3 &&
    longitude <= 135.7
  ) {
    return 'osaka';
  }

  // Chiang Mai bounding box
  if (
    latitude >= 18.7 &&
    latitude <= 18.9 &&
    longitude >= 98.9 &&
    longitude <= 99.1
  ) {
    return 'chiang mai';
  }

  return null;
}

/**
 * Get nearest train station based on coordinates
 * TODO: Integrate with Google Places API for real station data
 * For now, returns mock station names based on rough location
 */
export async function getNearestStation(
  coordinates: Coordinates
): Promise<Station | null> {
  const { latitude, longitude } = coordinates;

  // Mock station detection based on rough coordinates
  // TODO: Replace with Google Places API call:
  // const response = await fetch(
  //   `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
  //   `location=${latitude},${longitude}&` +
  //   `radius=500&` +
  //   `type=train_station&` +
  //   `key=${config.googlePlacesApiKey}`
  // );

  // Tokyo area - rough station guesses
  if (latitude >= 35.65 && latitude <= 35.67 && longitude >= 139.69 && longitude <= 139.71) {
    return {
      name: 'Shibuya',
      lines: ['Yamanote', 'Ginza', 'Hanzomon', 'Fukutoshin'],
    };
  }

  if (latitude >= 35.68 && latitude <= 35.70 && longitude >= 139.69 && longitude <= 139.71) {
    return {
      name: 'Shinjuku',
      lines: ['Yamanote', 'Chuo', 'Shonan-Shinjuku', 'Oedo'],
    };
  }

  if (latitude >= 35.70 && latitude <= 35.72 && longitude >= 139.76 && longitude <= 139.78) {
    return {
      name: 'Asakusa',
      lines: ['Ginza', 'Asakusa', 'Tobu Skytree'],
    };
  }

  if (latitude >= 35.67 && latitude <= 35.69 && longitude >= 139.75 && longitude <= 139.77) {
    return {
      name: 'Akihabara',
      lines: ['Yamanote', 'Keihin-Tohoku', 'Hibiya'],
    };
  }

  // Default fallback
  const city = detectCity(coordinates);
  if (city === 'tokyo') {
    return {
      name: 'Tokyo',
      lines: ['Yamanote'],
    };
  }

  return null;
}

/**
 * Get neighborhood name from coordinates using reverse geocoding
 */
export async function getNeighborhoodName(coordinates: Coordinates): Promise<string | null> {
  try {
    const [reverseGeocode] = await Location.reverseGeocodeAsync({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });

    if (reverseGeocode) {
      // Try to build a useful location string
      const parts = [
        reverseGeocode.district || reverseGeocode.subregion,
        reverseGeocode.city,
        reverseGeocode.region,
      ].filter(Boolean);

      const locationName = parts.join(', ');
      return locationName;
    }

    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}
