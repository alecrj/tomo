import { Coordinates, Spot } from '../types';
import { config } from '../constants/config';
import { useOfflineStore } from '../stores/useOfflineStore';

/**
 * Google Places API (New) service
 * Uses Places API (New) - https://developers.google.com/maps/documentation/places/web-service/op-overview
 */

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

// Check if online
const checkOnline = (): boolean => {
  return useOfflineStore.getState().isOnline;
};

interface PlaceSearchResult {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  rating?: number;
  priceLevel?: string;
  regularOpeningHours?: {
    openNow: boolean;
    weekdayDescriptions?: string[];
  };
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
  }>;
}

/**
 * Search for nearby places
 */
export async function searchNearby(
  coords: Coordinates,
  query: string,
  type?: string,
  radius: number = 2000
): Promise<PlaceSearchResult[]> {
  // Return empty if offline
  if (!checkOnline()) {
    console.log('[Places] Offline - returning empty results');
    return [];
  }

  try {
    const response = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlacesApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.regularOpeningHours',
      },
      body: JSON.stringify({
        includedTypes: type ? [type] : undefined,
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: {
              latitude: coords.latitude,
              longitude: coords.longitude,
            },
            radius,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }

    const data = await response.json();
    return data.places || [];
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
}

/**
 * Get full details for a place
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceSearchResult | null> {
  try {
    const response = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': config.googlePlacesApiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,priceLevel,regularOpeningHours,photos',
      },
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

/**
 * Convert Google Places price level to our 1-4 scale
 */
function mapPriceLevel(googlePriceLevel?: string): 1 | 2 | 3 | 4 {
  switch (googlePriceLevel) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 1;
    case 'PRICE_LEVEL_MODERATE':
      return 2;
    case 'PRICE_LEVEL_EXPENSIVE':
      return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 4;
    default:
      return 2; // Default to moderate
  }
}

/**
 * Get photo URL from photo reference
 */
function getPhotoUrl(photoName: string, maxWidth: number = 400): string {
  return `${PLACES_API_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${config.googlePlacesApiKey}`;
}

/**
 * Convert Google Places result to our Spot type
 */
export function placeToSpot(place: PlaceSearchResult, description: string = ''): Spot {
  return {
    placeId: place.id,
    name: place.displayName.text,
    description,
    rating: place.rating,
    priceLevel: mapPriceLevel(place.priceLevel),
    photos: place.photos?.map((p) => getPhotoUrl(p.name)),
    hours: place.regularOpeningHours?.weekdayDescriptions?.join('\n'),
    isOpen: place.regularOpeningHours?.openNow,
  };
}

/**
 * Batch fetch place details for multiple place IDs
 */
export async function getPlacesByIds(placeIds: string[]): Promise<Spot[]> {
  try {
    const promises = placeIds.map((id) => getPlaceDetails(id));
    const results = await Promise.all(promises);

    return results
      .filter((place): place is PlaceSearchResult => place !== null)
      .map((place) => placeToSpot(place));
  } catch (error) {
    console.error('Error batch fetching places:', error);
    return [];
  }
}

/**
 * Search for nearby places by type (alias for searchNearby used by home screen)
 */
export async function searchNearbyPlaces(
  coords: Coordinates,
  type: string,
  radius: number = 2000
): Promise<PlaceSearchResult[]> {
  return searchNearby(coords, '', type, radius);
}

/**
 * Search for specific place by name
 */
export async function searchPlace(
  query: string,
  coords: Coordinates
): Promise<PlaceSearchResult | null> {
  // Return null if offline
  if (!checkOnline()) {
    console.log('[Places] Offline - cannot search place');
    return null;
  }

  try {
    const response = await fetch(`${PLACES_API_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlacesApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.regularOpeningHours,places.photos',
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: {
              latitude: coords.latitude,
              longitude: coords.longitude,
            },
            radius: 5000,
          },
        },
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }

    const data = await response.json();
    return data.places?.[0] || null;
  } catch (error) {
    console.error('Error searching place:', error);
    return null;
  }
}

/**
 * Get photo URL for a place by searching for it
 * Returns the first photo URL or null if not found
 */
export async function getPlacePhotoUrl(
  placeName: string,
  coords: Coordinates,
  maxWidth: number = 400
): Promise<string | null> {
  try {
    const place = await searchPlace(placeName, coords);
    if (place?.photos && place.photos.length > 0) {
      return getPhotoUrl(place.photos[0].name, maxWidth);
    }
    return null;
  } catch (error) {
    console.error('Error getting place photo:', error);
    return null;
  }
}

/**
 * Public accessor for photo URL construction
 */
export function buildPhotoUrl(photoName: string, maxWidth: number = 400): string {
  return getPhotoUrl(photoName, maxWidth);
}
