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
 */
function getResyUrl(placeName: string, coordinates: Coordinates): string {
  const searchQuery = encodeURIComponent(placeName);
  return `https://resy.com/cities/ny?query=${searchQuery}`;
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

  // Always show navigation option
  options.push({
    provider: 'google_maps',
    label: 'Navigate',
    icon: '🗺️',
    url: getGoogleMapsUrl(place.coordinates, place.name),
    available: true,
  });

  return options;
}

/**
 * Open a booking URL
 */
export async function openBookingUrl(url: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      // Fallback to web URL if app deep link fails
      if (url.startsWith('uber://')) {
        await Linking.openURL(url.replace('uber://', 'https://m.uber.com/'));
        return true;
      }
      if (url.startsWith('grab://')) {
        await Linking.openURL('https://grab.com');
        return true;
      }
      console.log('[Booking] Cannot open URL:', url);
      return false;
    }
  } catch (error) {
    console.error('[Booking] Error opening URL:', error);
    return false;
  }
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
      label: 'Navigate',
      icon: '🗺️',
      action: async () => {
        await openBookingUrl(getGoogleMapsUrl(place.coordinates, place.name));
      },
    },
    {
      label: 'Reviews',
      icon: '🦉',
      action: async () => {
        await openBookingUrl(getTripAdvisorUrl(place.name));
      },
    },
  ];
}
