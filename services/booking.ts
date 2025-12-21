/**
 * Booking Deep Links Service
 * Provides deep links to booking platforms for restaurants, transport, etc.
 */

import { Linking, Platform } from 'react-native';
import type { Coordinates, PlaceCardData } from '../types';

export type BookingProvider =
  | 'opentable'
  | 'resy'
  | 'uber'
  | 'grab'
  | 'google_maps'
  | 'booking_com'
  | 'airbnb'
  | 'tripadvisor';

export interface BookingOption {
  provider: BookingProvider;
  label: string;
  icon: string; // Emoji for now, could be icon component
  url: string;
  available: boolean;
}

/**
 * Generate booking URL for OpenTable
 */
function getOpenTableUrl(placeName: string, coordinates: Coordinates): string {
  const searchQuery = encodeURIComponent(placeName);
  // OpenTable doesn't have deep links for specific restaurants without their ID,
  // so we link to search results
  return `https://www.opentable.com/s?term=${searchQuery}&latitude=${coordinates.latitude}&longitude=${coordinates.longitude}`;
}

/**
 * Generate booking URL for Resy
 * Note: Resy search URL is location-agnostic when using direct search
 */
function getResyUrl(placeName: string, _coordinates: Coordinates): string {
  const searchQuery = encodeURIComponent(placeName);
  // Use Resy's location-agnostic search - it will auto-detect or show results from all cities
  return `https://resy.com/s/${searchQuery}`;
}

/**
 * Generate Uber deep link
 */
function getUberUrl(destination: Coordinates, placeName: string): string {
  const nickname = encodeURIComponent(placeName);
  // Uber deep link format
  if (Platform.OS === 'ios') {
    return `uber://?action=setPickup&dropoff[latitude]=${destination.latitude}&dropoff[longitude]=${destination.longitude}&dropoff[nickname]=${nickname}`;
  }
  return `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${destination.latitude}&dropoff[longitude]=${destination.longitude}&dropoff[nickname]=${nickname}`;
}

/**
 * Generate Grab deep link (Southeast Asia)
 */
function getGrabUrl(destination: Coordinates, placeName: string): string {
  // Grab deep link format
  return `grab://open?type=booking&dropOff[latitude]=${destination.latitude}&dropOff[longitude]=${destination.longitude}`;
}

/**
 * Generate Google Maps navigation URL
 */
function getGoogleMapsUrl(destination: Coordinates, placeName?: string): string {
  const baseUrl = 'https://www.google.com/maps/dir/?api=1';
  const destParam = `&destination=${destination.latitude},${destination.longitude}`;
  const nameParam = placeName ? `&destination_place_id=${encodeURIComponent(placeName)}` : '';
  return `${baseUrl}${destParam}${nameParam}&travelmode=walking`;
}

/**
 * Generate Booking.com search URL
 */
function getBookingUrl(placeName: string, coordinates: Coordinates): string {
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(placeName)}&latitude=${coordinates.latitude}&longitude=${coordinates.longitude}`;
}

/**
 * Generate Airbnb experiences URL
 */
function getAirbnbUrl(placeName: string, coordinates: Coordinates): string {
  return `https://www.airbnb.com/s/${encodeURIComponent(placeName)}/experiences`;
}

/**
 * Generate TripAdvisor URL
 */
function getTripAdvisorUrl(placeName: string): string {
  return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(placeName)}`;
}

/**
 * Get available booking options for a place
 */
export function getBookingOptions(place: PlaceCardData): BookingOption[] {
  const options: BookingOption[] = [];

  // Restaurant booking options
  options.push({
    provider: 'opentable',
    label: 'OpenTable',
    icon: '🍽️',
    url: getOpenTableUrl(place.name, place.coordinates),
    available: true,
  });

  options.push({
    provider: 'resy',
    label: 'Resy',
    icon: '📋',
    url: getResyUrl(place.name, place.coordinates),
    available: true,
  });

  // Transport options
  options.push({
    provider: 'uber',
    label: 'Uber',
    icon: '🚗',
    url: getUberUrl(place.coordinates, place.name),
    available: true,
  });

  options.push({
    provider: 'grab',
    label: 'Grab',
    icon: '🛵',
    url: getGrabUrl(place.coordinates, place.name),
    available: true, // Would be conditional based on region
  });

  // Navigation
  options.push({
    provider: 'google_maps',
    label: 'Google Maps',
    icon: '🗺️',
    url: getGoogleMapsUrl(place.coordinates, place.name),
    available: true,
  });

  // Reviews
  options.push({
    provider: 'tripadvisor',
    label: 'TripAdvisor',
    icon: '🦉',
    url: getTripAdvisorUrl(place.name),
    available: true,
  });

  return options;
}

/**
 * Get primary booking options (most relevant)
 * Note: We don't include Google Maps navigation here since Tomo has in-app navigation
 */
export function getPrimaryBookingOptions(place: PlaceCardData, category?: string): BookingOption[] {
  // Determine likely category from place type or name
  const isRestaurant =
    category === 'food' ||
    place.name.toLowerCase().includes('restaurant') ||
    place.name.toLowerCase().includes('cafe') ||
    place.name.toLowerCase().includes('bar') ||
    place.priceLevel !== undefined;

  const options: BookingOption[] = [];

  if (isRestaurant) {
    options.push({
      provider: 'opentable',
      label: 'Reserve',
      icon: '🍽️',
      url: getOpenTableUrl(place.name, place.coordinates),
      available: true,
    });
  }

  // Always show ride option
  options.push({
    provider: 'uber',
    label: 'Get a Ride',
    icon: '🚗',
    url: getUberUrl(place.coordinates, place.name),
    available: true,
  });

  // Note: No Google Maps - use Tomo's in-app navigation instead ("Take me there" button)

  return options;
}

/**
 * Open a booking URL with robust fallbacks
 * On iOS, canOpenURL throws if URL scheme isn't in LSApplicationQueriesSchemes
 */
export async function openBookingUrl(url: string): Promise<boolean> {
  // Helper to get web fallback URL
  const getWebFallback = (originalUrl: string): string | null => {
    if (originalUrl.startsWith('uber://')) {
      return 'https://m.uber.com/';
    }
    if (originalUrl.startsWith('grab://')) {
      return 'https://grab.com';
    }
    if (originalUrl.startsWith('comgooglemaps://')) {
      // Extract coordinates from Google Maps deep link and use web URL
      const match = originalUrl.match(/daddr=([^&]+)/);
      if (match) {
        return `https://www.google.com/maps/dir/?api=1&destination=${match[1]}`;
      }
    }
    return null;
  };

  try {
    // Try to check if we can open the URL (may throw on iOS)
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    // iOS throws if scheme not in LSApplicationQueriesSchemes - expected behavior
    console.log('[Booking] App not available, trying web fallback');
  }

  // Try web fallback
  const webFallback = getWebFallback(url);
  if (webFallback) {
    try {
      await Linking.openURL(webFallback);
      return true;
    } catch (error) {
      console.error('[Booking] Web fallback failed:', error);
    }
  }

  // Last resort: open in Google Maps web
  if (url.includes('daddr=') || url.includes('destination=')) {
    try {
      // Try to extract destination and open Google Maps web
      const coordMatch = url.match(/(\d+\.\d+)[,|%2C](\d+\.\d+)/);
      if (coordMatch) {
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coordMatch[1]},${coordMatch[2]}`;
        await Linking.openURL(mapsUrl);
        return true;
      }
    } catch {
      console.log('[Booking] Could not open any URL');
    }
  }

  console.log('[Booking] No fallback available for:', url);
  return false;
}

/**
 * Quick actions for a place
 */
export interface QuickAction {
  label: string;
  icon: string;
  action: () => Promise<void>;
}

export function getQuickActions(place: PlaceCardData): QuickAction[] {
  return [
    {
      label: 'Reserve',
      icon: '🍽️',
      action: async () => {
        await openBookingUrl(getOpenTableUrl(place.name, place.coordinates));
      },
    },
    {
      label: 'Get Ride',
      icon: '🚗',
      action: async () => {
        await openBookingUrl(getUberUrl(place.coordinates, place.name));
      },
    },
    {
      label: 'Reviews',
      icon: '🦉',
      action: async () => {
        await openBookingUrl(getTripAdvisorUrl(place.name));
      },
    },
    // Note: Navigation is handled in-app via "Take me there" button
  ];
}
