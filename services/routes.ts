import { Coordinates, TransitStep, TransitRoute } from '../types';
import { config } from '../constants/config';
import { useOfflineStore } from '../stores/useOfflineStore';
import { usePreferencesStore, Language } from '../stores/usePreferencesStore';

/**
 * Get the Google API language code from user preference
 */
function getLanguageCode(): string {
  const language = usePreferencesStore.getState().language;
  // Map our language codes to Google's format
  const languageMap: Record<Language, string> = {
    en: 'en',
    ja: 'ja',
    ko: 'ko',
    zh: 'zh-CN',
    es: 'es',
    fr: 'fr',
    de: 'de',
    it: 'it',
    pt: 'pt',
    th: 'th',
  };
  return languageMap[language] || 'en';
}

/**
 * Check if we're online before making API calls
 */
function checkOnline(): boolean {
  return useOfflineStore.getState().isOnline;
}

/**
 * Create a fallback route based on straight-line distance when offline
 */
function createFallbackRoute(
  origin: Coordinates,
  destination: Coordinates,
  mode: 'WALK' | 'TRANSIT' | 'DRIVE'
): TransitRoute {
  // Calculate straight-line distance
  const R = 6371e3; // Earth's radius in meters
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lat2 = (destination.latitude * Math.PI) / 180;
  const deltaLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const deltaLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineDistance = R * c;

  // Estimate actual distance (add 30% for path curvature)
  const estimatedDistance = Math.round(straightLineDistance * 1.3);

  // Estimate duration based on mode
  let durationMinutes: number;
  let stepMode: 'walk' | 'train' | 'taxi';

  switch (mode) {
    case 'WALK':
      durationMinutes = Math.ceil(estimatedDistance / 80); // ~4.8 km/h
      stepMode = 'walk';
      break;
    case 'TRANSIT':
      durationMinutes = Math.ceil(estimatedDistance / 400); // ~24 km/h avg with stops
      stepMode = 'train';
      break;
    case 'DRIVE':
      durationMinutes = Math.ceil(estimatedDistance / 500); // ~30 km/h city driving
      stepMode = 'taxi';
      break;
  }

  return {
    steps: [{
      mode: stepMode,
      instruction: `Head toward destination (offline estimate)`,
      duration: durationMinutes,
      distance: estimatedDistance,
    }],
    totalDuration: durationMinutes,
    totalDistance: estimatedDistance,
    polyline: '', // No polyline for fallback
  };
}

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
  // Check offline status first
  if (!checkOnline()) {
    const cached = useOfflineStore.getState().getCachedRoute(origin, destination, 'TRANSIT');
    if (cached) return cached;
    return createFallbackRoute(origin, destination, 'TRANSIT');
  }

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
      languageCode: getLanguageCode(),
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

    // Parse route into our TransitRoute format
    return parseGoogleRoute(route, origin, destination);
  } catch (error) {
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
  // Check offline status first
  if (!checkOnline()) {
    const cached = useOfflineStore.getState().getCachedRoute(origin, destination, 'DRIVE');
    if (cached) return cached;
    return createFallbackRoute(origin, destination, 'DRIVE');
  }

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
      languageCode: getLanguageCode(),
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
    return null;
  }
}

/**
 * Calculate straight-line distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
function calculateStraightLineDistance(origin: Coordinates, destination: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lat2 = (destination.latitude * Math.PI) / 180;
  const deltaLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const deltaLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Estimate walking duration based on distance
 * Average walking speed: ~5 km/h = ~83 meters/minute
 */
function estimateWalkingDuration(distanceMeters: number): number {
  const walkingSpeedMetersPerMinute = 80; // Conservative estimate (~4.8 km/h)
  return Math.max(1, Math.ceil(distanceMeters / walkingSpeedMetersPerMinute));
}

/**
 * Get walking directions (fallback when transit not available)
 */
export async function getWalkingDirections(
  origin: Coordinates,
  destination: Coordinates
): Promise<TransitRoute | null> {
  // Check offline status first
  if (!checkOnline()) {
    const cached = useOfflineStore.getState().getCachedRoute(origin, destination, 'WALK');
    if (cached) return cached;
    return createFallbackRoute(origin, destination, 'WALK');
  }

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
      languageCode: getLanguageCode(),
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
      // Fallback: create a basic walking route using straight-line distance
      const fallbackDistance = calculateStraightLineDistance(origin, destination);
      const fallbackDuration = estimateWalkingDuration(fallbackDistance * 1.3);

      return {
        steps: [{
          mode: 'walk',
          instruction: 'Walk to destination',
          duration: fallbackDuration,
          distance: Math.round(fallbackDistance * 1.3),
        }],
        totalDuration: fallbackDuration,
        totalDistance: Math.round(fallbackDistance * 1.3),
        polyline: '', // No polyline for fallback
      };
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

    // Get distance - fallback to calculation if not provided
    let totalDistance = route.distanceMeters;
    if (!totalDistance || totalDistance === 0) {
      totalDistance = Math.round(calculateStraightLineDistance(origin, destination) * 1.3);
    }

    // Get duration - fallback to estimation if not provided or 0
    let totalDuration = Math.round(parseDuration(route.duration));
    if (!totalDuration || totalDuration === 0) {
      totalDuration = estimateWalkingDuration(totalDistance);
    }

    return {
      steps,
      totalDuration,
      totalDistance,
      polyline: route.polyline?.encodedPolyline || '',
    };
  } catch (error) {
    // Even on error, try to return a basic estimate
    try {
      const fallbackDistance = calculateStraightLineDistance(origin, destination);
      const fallbackDuration = estimateWalkingDuration(fallbackDistance * 1.3);

      return {
        steps: [{
          mode: 'walk',
          instruction: 'Walk to destination',
          duration: fallbackDuration,
          distance: Math.round(fallbackDistance * 1.3),
        }],
        totalDuration: fallbackDuration,
        totalDistance: Math.round(fallbackDistance * 1.3),
        polyline: '',
      };
    } catch {
      return null;
    }
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

// === ROUTE OPTIMIZATION ===

export interface OptimizedRouteResult {
  optimizedOrder: number[];     // Index order of waypoints (0-based, excludes origin/dest)
  totalDistance: number;        // Total distance in meters
  totalDuration: number;        // Total duration in minutes
  polyline: string;             // Encoded polyline for the entire route
  legs: Array<{
    startIndex: number;         // Index of starting waypoint
    endIndex: number;           // Index of ending waypoint
    distance: number;           // Distance in meters
    duration: number;           // Duration in minutes
  }>;
}

/**
 * Optimize the order of waypoints for the shortest walking route
 * Uses Google Routes API with optimizeWaypointOrder parameter
 *
 * @param waypoints Array of coordinates to visit (minimum 2)
 * @param origin Starting point (defaults to first waypoint)
 * @param destination Ending point (defaults to last waypoint or back to origin for round trip)
 * @param roundTrip If true, returns to origin after visiting all waypoints
 */
export async function optimizeRoute(
  waypoints: Coordinates[],
  origin?: Coordinates,
  destination?: Coordinates,
  roundTrip: boolean = false
): Promise<OptimizedRouteResult | null> {
  try {
    if (waypoints.length < 2) {
      return null;
    }

    // If no explicit origin, use first waypoint
    const routeOrigin = origin || waypoints[0];

    // If no explicit destination, use last waypoint (or origin for round trip)
    const routeDestination = destination || (roundTrip ? routeOrigin : waypoints[waypoints.length - 1]);

    // Intermediate waypoints (excluding origin/destination if they're from the array)
    let intermediates = [...waypoints];
    if (!origin) {
      intermediates = intermediates.slice(1); // Remove first as it's origin
    }
    if (!destination && !roundTrip) {
      intermediates = intermediates.slice(0, -1); // Remove last as it's destination
    }

    // Build request body
    const requestBody: any = {
      origin: {
        location: {
          latLng: {
            latitude: routeOrigin.latitude,
            longitude: routeOrigin.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: routeDestination.latitude,
            longitude: routeDestination.longitude,
          },
        },
      },
      travelMode: 'WALK',
      optimizeWaypointOrder: true, // Key parameter for optimization
      languageCode: getLanguageCode(),
      units: 'METRIC',
    };

    // Add intermediates if any
    if (intermediates.length > 0) {
      requestBody.intermediates = intermediates.map((coord) => ({
        location: {
          latLng: {
            latitude: coord.latitude,
            longitude: coord.longitude,
          },
        },
      }));
    }

    const response = await fetch(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlacesApiKey,
        'X-Goog-FieldMask': 'routes.legs,routes.distanceMeters,routes.duration,routes.polyline,routes.optimizedIntermediateWaypointIndex',
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

    const route = data.routes[0];

    // Parse optimized waypoint order
    // Google returns 0-based indices for intermediates only
    const optimizedOrder: number[] = route.optimizedIntermediateWaypointIndex ||
      intermediates.map((_, i) => i);

    // Parse legs
    const legs = route.legs.map((leg: GoogleRouteLeg, index: number) => ({
      startIndex: index === 0 ? -1 : optimizedOrder[index - 1], // -1 for origin
      endIndex: index === route.legs.length - 1 ? -2 : optimizedOrder[index], // -2 for destination
      distance: leg.distanceMeters,
      duration: Math.round(parseDuration(leg.duration)),
    }));

    return {
      optimizedOrder,
      totalDistance: route.distanceMeters,
      totalDuration: Math.round(parseDuration(route.duration)),
      polyline: route.polyline?.encodedPolyline || '',
      legs,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get a complete route through multiple waypoints (without optimization)
 * Useful for getting polyline and stats for a specific order
 */
export async function getMultiWaypointRoute(
  waypoints: Coordinates[]
): Promise<OptimizedRouteResult | null> {
  try {
    if (waypoints.length < 2) {
      return null;
    }

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediates = waypoints.slice(1, -1);

    const requestBody: any = {
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
      optimizeWaypointOrder: false, // Keep original order
      languageCode: getLanguageCode(),
      units: 'METRIC',
    };

    if (intermediates.length > 0) {
      requestBody.intermediates = intermediates.map((coord) => ({
        location: {
          latLng: {
            latitude: coord.latitude,
            longitude: coord.longitude,
          },
        },
      }));
    }

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

    const route = data.routes[0];

    // Parse legs (keeping original order)
    const legs = route.legs.map((leg: GoogleRouteLeg, index: number) => ({
      startIndex: index - 1, // -1 for origin
      endIndex: index,
      distance: leg.distanceMeters,
      duration: Math.round(parseDuration(leg.duration)),
    }));

    return {
      optimizedOrder: intermediates.map((_, i) => i), // Original order
      totalDistance: route.distanceMeters,
      totalDuration: Math.round(parseDuration(route.duration)),
      polyline: route.polyline?.encodedPolyline || '',
      legs,
    };
  } catch (error) {
    return null;
  }
}
