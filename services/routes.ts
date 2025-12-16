import { Coordinates, TransitStep, TransitRoute } from '../types';
import { config } from '../constants/config';

/**
 * Google Routes API service
 * Uses Routes API v2 - https://developers.google.com/maps/documentation/routes
 */

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

interface GoogleTransitDetails {
  stopDetails: {
    arrivalStop?: { name: string; location: { latLng: { latitude: number; longitude: number } } };
    departureStop?: { name: string; location: { latLng: { latitude: number; longitude: number } } };
  };
  transitLine: {
    agencies?: Array<{ name: string }>;
    name?: string;
    nameShort?: string;
    color?: string;
    vehicle?: { name: { text: string }; type: string };
  };
  headsign?: string;
  headway?: string;
  localizedValues?: {
    arrivalTime?: { time: { text: string } };
    departureTime?: { time: { text: string } };
  };
  stopCount?: number;
}

interface GoogleRouteLeg {
  steps: Array<{
    travelMode: string;
    startLocation: { latLng: { latitude: number; longitude: number } };
    endLocation: { latLng: { latitude: number; longitude: number } };
    staticDuration: string;
    distanceMeters: number;
    navigationInstruction?: {
      instructions: string;
      maneuver?: string;
    };
    transitDetails?: GoogleTransitDetails;
  }>;
  distanceMeters: number;
  duration: string;
}

interface GoogleRoute {
  legs: GoogleRouteLeg[];
  distanceMeters: number;
  duration: string;
  polyline: {
    encodedPolyline: string;
  };
}

/**
 * Get transit directions from origin to destination
 */
export async function getTransitDirections(
  origin: Coordinates,
  destination: Coordinates,
  departureTime?: Date
): Promise<TransitRoute | null> {
  try {
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
      },
      travelMode: 'TRANSIT',
      computeAlternativeRoutes: false,
      transitPreferences: {
        allowedTravelModes: ['TRAIN', 'SUBWAY', 'BUS'],
        routingPreference: 'FEWER_TRANSFERS',
      },
      languageCode: 'en-US',
      units: 'METRIC',
    };

    const response = await fetch(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlacesApiKey,
        'X-Goog-FieldMask': 'routes.legs,routes.distanceMeters,routes.duration,routes.polyline',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Routes API error:', response.status, errorText);
      throw new Error(`Routes API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.error('No routes found');
      return null;
    }

    const route: GoogleRoute = data.routes[0];

    // Parse route into our TransitRoute format
    return parseGoogleRoute(route, origin, destination);
  } catch (error) {
    console.error('Error getting transit directions:', error);
    return null;
  }
}

/**
 * Parse Google Routes response into our TransitRoute format
 */
function parseGoogleRoute(
  route: GoogleRoute,
  origin: Coordinates,
  destination: Coordinates
): TransitRoute {
  const steps: TransitStep[] = [];
  let lastTrainTime: Date | undefined;

  // Parse each leg and step
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      const duration = parseDuration(step.staticDuration);
      const distance = step.distanceMeters;

      if (step.travelMode === 'WALK') {
        // Walking step
        steps.push({
          mode: 'walk',
          instruction: step.navigationInstruction?.instructions || 'Walk to next stop',
          duration,
          distance,
        });
      } else if (step.travelMode === 'TRANSIT' && step.transitDetails) {
        // Transit step (train/bus)
        const transit = step.transitDetails;
        const vehicleType = transit.transitLine.vehicle?.type?.toLowerCase() || 'train';
        const mode = vehicleType.includes('bus') ? 'bus' : 'train';

        const lineName = transit.transitLine.nameShort || transit.transitLine.name || 'Line';
        const direction = transit.headsign || '';

        const departureStop = transit.stopDetails.departureStop?.name || '';
        const arrivalStop = transit.stopDetails.arrivalStop?.name || '';

        const instruction = `Take ${lineName} towards ${direction}`;
        const details = `${transit.stopCount || 0} stops from ${departureStop} to ${arrivalStop}`;

        // Extract last train time for warnings
        if (transit.localizedValues?.departureTime?.time?.text) {
          const timeText = transit.localizedValues.departureTime.time.text;
          const parsedTime = parseTimeString(timeText);
          if (parsedTime && (!lastTrainTime || parsedTime > lastTrainTime)) {
            lastTrainTime = parsedTime;
          }
        }

        steps.push({
          mode,
          instruction,
          details,
          line: lineName,
          direction,
          duration,
          distance,
        });
      }
    }
  }

  // Calculate total duration and distance
  const totalDuration = Math.round(parseDuration(route.duration));
  const totalDistance = route.distanceMeters;

  return {
    steps,
    totalDuration,
    totalDistance,
    polyline: route.polyline.encodedPolyline,
    lastTrain: lastTrainTime,
  };
}

/**
 * Parse duration string to minutes
 * Google Routes API returns duration as seconds string (e.g., "1860s")
 * Also supports ISO 8601 format (e.g., "PT15M30S") as fallback
 */
function parseDuration(duration: string): number {
  if (!duration) return 0;

  // Google Routes API format: "1860s" (seconds as string)
  const secondsMatch = duration.match(/^(\d+(?:\.\d+)?)s$/);
  if (secondsMatch) {
    const seconds = parseFloat(secondsMatch[1]);
    return seconds / 60; // Convert to minutes
  }

  // ISO 8601 duration format fallback: "PT15M30S"
  const isoMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || '0', 10);
    const minutes = parseInt(isoMatch[2] || '0', 10);
    const seconds = parseInt(isoMatch[3] || '0', 10);
    return hours * 60 + minutes + seconds / 60;
  }

  console.warn('[Routes] Unknown duration format:', duration);
  return 0;
}

/**
 * Parse time string (e.g., "11:47 PM") to Date object
 * Assumes today's date
 */
function parseTimeString(timeText: string): Date | null {
  try {
    const today = new Date();
    const [time, period] = timeText.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }

    const date = new Date(today);
    date.setHours(hour24, minutes, 0, 0);

    return date;
  } catch (error) {
    console.error('Error parsing time string:', timeText, error);
    return null;
  }
}

// Travel mode type
export type TravelMode = 'WALK' | 'TRANSIT' | 'DRIVE';

/**
 * Get directions for any travel mode
 */
export async function getDirections(
  origin: Coordinates,
  destination: Coordinates,
  mode: TravelMode = 'WALK'
): Promise<TransitRoute | null> {
  switch (mode) {
    case 'TRANSIT':
      return getTransitDirections(origin, destination);
    case 'DRIVE':
      return getDrivingDirections(origin, destination);
    case 'WALK':
    default:
      return getWalkingDirections(origin, destination);
  }
}

/**
 * Get driving directions
 */
export async function getDrivingDirections(
  origin: Coordinates,
  destination: Coordinates
): Promise<TransitRoute | null> {
  try {
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      languageCode: 'en-US',
      units: 'METRIC',
    };

    const response = await fetch(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlacesApiKey,
        'X-Goog-FieldMask': 'routes.legs,routes.distanceMeters,routes.duration,routes.polyline',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Routes API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route: GoogleRoute = data.routes[0];

    // Parse driving route
    const steps: TransitStep[] = route.legs.flatMap((leg) =>
      leg.steps.map((step) => ({
        mode: 'taxi' as const, // Using 'taxi' for driving mode
        instruction: step.navigationInstruction?.instructions || 'Continue driving',
        duration: parseDuration(step.staticDuration),
        distance: step.distanceMeters,
      }))
    );

    return {
      steps,
      totalDuration: Math.round(parseDuration(route.duration)),
      totalDistance: route.distanceMeters,
      polyline: route.polyline.encodedPolyline,
    };
  } catch (error) {
    console.error('Error getting driving directions:', error);
    return null;
  }
}

/**
 * Get walking directions (fallback when transit not available)
 */
export async function getWalkingDirections(
  origin: Coordinates,
  destination: Coordinates
): Promise<TransitRoute | null> {
  try {
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
      },
      travelMode: 'WALK',
      languageCode: 'en-US',
      units: 'METRIC',
    };

    console.log('[Routes] Using API key:', config.googlePlacesApiKey?.substring(0, 15) + '...');

    const response = await fetch(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlacesApiKey,
        'X-Goog-FieldMask': 'routes.legs,routes.distanceMeters,routes.duration,routes.polyline',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Routes] FULL ERROR from Google:', errorBody);
      throw new Error(`Routes API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route: GoogleRoute = data.routes[0];

    // Parse walking route
    const steps: TransitStep[] = route.legs.flatMap((leg) =>
      leg.steps.map((step) => ({
        mode: 'walk' as const,
        instruction: step.navigationInstruction?.instructions || 'Continue walking',
        duration: parseDuration(step.staticDuration),
        distance: step.distanceMeters,
      }))
    );

    const result = {
      steps,
      totalDuration: Math.round(parseDuration(route.duration)),
      totalDistance: route.distanceMeters,
      polyline: route.polyline.encodedPolyline,
    };

    console.log('[Routes] Walking directions fetched:', {
      steps: result.steps.length,
      duration: result.totalDuration,
      distance: result.totalDistance,
      hasPolyline: !!result.polyline,
    });

    return result;
  } catch (error) {
    console.error('Error getting walking directions:', error);
    return null;
  }
}

/**
 * Get directions to home base
 */
export async function getDirectionsHome(
  currentLocation: Coordinates,
  homeBase: Coordinates
): Promise<TransitRoute | null> {
  return getTransitDirections(currentLocation, homeBase);
}

/**
 * Calculate ETA (Estimated Time of Arrival)
 */
export function calculateETA(route: TransitRoute): Date {
  const now = new Date();
  const etaMs = now.getTime() + route.totalDuration * 60 * 1000;
  return new Date(etaMs);
}

/**
 * Check if last train warning needed
 * Returns minutes until last train, or null if not applicable
 */
export function getMinutesUntilLastTrain(route: TransitRoute): number | null {
  if (!route.lastTrain) return null;

  const now = new Date();
  const diffMs = route.lastTrain.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  return diffMinutes > 0 ? diffMinutes : null;
}
