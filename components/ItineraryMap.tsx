import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import { useRouter } from 'expo-router';
import {
  Navigation,
  Route,
  Clock,
  Footprints,
  Sparkles,
  Play,
  MapPin,
} from 'lucide-react-native';
import { colors, spacing, typography, borders, shadows, mapStyle } from '../constants/theme';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { useLocationStore } from '../stores/useLocationStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useItineraryStore } from '../stores/useItineraryStore';
import {
  optimizeRoute,
  getMultiWaypointRoute,
  OptimizedRouteResult,
} from '../services/routes';
import { decodePolyline } from '../utils/polyline';
import type { Activity, Coordinates, Destination } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Use Apple Maps for tiles, Google APIs for data
const MAP_PROVIDER = PROVIDER_DEFAULT;

interface ItineraryMapProps {
  activities: Activity[];
  dayDate: number;
  itineraryId: string;
  onActivityPress?: (activity: Activity) => void;
  compact?: boolean; // For smaller view in Plan tab
}

// Category colors for markers
const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF6B6B',
  culture: '#4ECDC4',
  activity: '#45B7D1',
  transport: '#96CEB4',
  rest: '#DDA0DD',
};

export default function ItineraryMap({
  activities,
  dayDate,
  itineraryId,
  onActivityPress,
  compact = false,
}: ItineraryMapProps) {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const userCoordinates = useLocationStore((state) => state.coordinates);
  const viewDestination = useNavigationStore((state) => state.viewDestination);
  const reorderActivities = useItineraryStore((state) => state.reorderActivities);

  const [routeResult, setRouteResult] = useState<OptimizedRouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Get activities with coordinates
  const activitiesWithCoords = useMemo(() => {
    return activities.filter((a) => a.place?.coordinates);
  }, [activities]);

  // Extract coordinates from activities
  const waypoints = useMemo(() => {
    return activitiesWithCoords.map((a) => a.place!.coordinates);
  }, [activitiesWithCoords]);

  // Fetch route when activities change
  useEffect(() => {
    async function fetchRoute() {
      if (waypoints.length < 2) {
        setRouteResult(null);
        return;
      }

      setIsLoadingRoute(true);
      try {
        // Include user location as starting point if available
        const routeWaypoints = userCoordinates
          ? [userCoordinates, ...waypoints]
          : waypoints;

        const result = await getMultiWaypointRoute(routeWaypoints);
        setRouteResult(result);

        // Fit map to show all markers
        if (mapRef.current && result) {
          const allCoords = userCoordinates
            ? [userCoordinates, ...waypoints]
            : waypoints;

          mapRef.current.fitToCoordinates(allCoords, {
            edgePadding: {
              top: compact ? 60 : 100,
              right: 50,
              bottom: compact ? 120 : 200,
              left: 50,
            },
            animated: true,
          });
        }
      } catch (error) {
        console.error('[ItineraryMap] Error fetching route:', error);
      } finally {
        setIsLoadingRoute(false);
      }
    }

    fetchRoute();
  }, [waypoints, userCoordinates, compact]);

  // Handle optimize route
  const handleOptimizeRoute = async () => {
    if (waypoints.length < 2) return;

    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    setIsOptimizing(true);

    try {
      // Optimize with user location as origin if available
      const result = await optimizeRoute(
        waypoints,
        userCoordinates || undefined,
        undefined,
        false
      );

      if (result && result.optimizedOrder) {
        safeHaptics.notification(NotificationFeedbackType.Success);

        // Reorder activities based on optimized order
        const newOrder = result.optimizedOrder.map(
          (index) => activitiesWithCoords[index].id
        );

        // Include activities without coordinates at the end
        const activitiesWithoutCoords = activities
          .filter((a) => !a.place?.coordinates)
          .map((a) => a.id);

        reorderActivities(itineraryId, dayDate, [...newOrder, ...activitiesWithoutCoords]);

        // Update route display
        setRouteResult(result);

      }
    } catch (error) {
      console.error('[ItineraryMap] Error optimizing route:', error);
      safeHaptics.notification(NotificationFeedbackType.Error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle start day navigation
  const handleStartDay = () => {
    if (activitiesWithCoords.length === 0) return;

    const firstActivity = activitiesWithCoords[0];
    if (!firstActivity.place) return;

    safeHaptics.impact(ImpactFeedbackStyle.Heavy);

    // Create destination from first activity
    const destination: Destination = {
      id: firstActivity.id,
      title: firstActivity.place.name,
      description: firstActivity.description,
      whatItIs: firstActivity.description,
      whenToGo: firstActivity.startTime || '',
      neighborhood: firstActivity.place.address || '',
      category: firstActivity.category === 'food' ? 'food' : 'culture',
      whyNow: 'First activity of your day',
      address: firstActivity.place.address,
      coordinates: firstActivity.place.coordinates,
      priceLevel: (firstActivity.place.priceLevel || 2) as 1 | 2 | 3 | 4,
      transitPreview: {
        method: 'walk',
        totalMinutes: 10,
        description: 'Walk',
      },
      spots: [],
    };

    viewDestination(destination);
    router.push('/navigation');
  };

  // Handle activity marker press
  const handleMarkerPress = (activity: Activity) => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    setSelectedActivityId(activity.id);

    if (activity.place?.coordinates && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: activity.place.coordinates.latitude,
          longitude: activity.place.coordinates.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        300
      );
    }

    onActivityPress?.(activity);
  };

  // Format duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Decode polyline for map
  const routeCoordinates = useMemo(() => {
    if (!routeResult?.polyline) return [];
    return decodePolyline(routeResult.polyline);
  }, [routeResult]);

  // Get initial region
  const initialRegion = useMemo(() => {
    if (waypoints.length > 0) {
      const avgLat =
        waypoints.reduce((sum, c) => sum + c.latitude, 0) / waypoints.length;
      const avgLng =
        waypoints.reduce((sum, c) => sum + c.longitude, 0) / waypoints.length;
      return {
        latitude: avgLat,
        longitude: avgLng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    if (userCoordinates) {
      return {
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return undefined;
  }, [waypoints, userCoordinates]);

  // Empty state
  if (activitiesWithCoords.length === 0) {
    return (
      <View style={[styles.emptyContainer, compact && styles.emptyContainerCompact]}>
        <MapPin size={32} color={colors.text.tertiary} />
        <Text style={styles.emptyText}>
          No activities with locations yet
        </Text>
        <Text style={styles.emptySubtext}>
          Add places to your day to see them on the map
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Apple Maps with dark mode */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        mapType="mutedStandard"
        userInterfaceStyle="dark"
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
      >
        {/* Activity markers with numbers */}
        {activitiesWithCoords.map((activity, index) => (
          <Marker
            key={activity.id}
            coordinate={activity.place!.coordinates}
            onPress={() => handleMarkerPress(activity)}
          >
            <View
              style={[
                styles.markerContainer,
                selectedActivityId === activity.id && styles.markerSelected,
                {
                  backgroundColor:
                    CATEGORY_COLORS[activity.category] || colors.accent.primary,
                },
              ]}
            >
              <Text style={styles.markerNumber}>{index + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <>
            {/* Route outline for contrast */}
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#000000"
              strokeWidth={8}
            />
            {/* Main route line - Google Maps blue */}
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#4285F4"
              strokeWidth={5}
            />
          </>
        )}
      </MapView>

      {/* Loading overlay */}
      {(isLoadingRoute || isOptimizing) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
          <Text style={styles.loadingText}>
            {isOptimizing ? 'Optimizing route...' : 'Loading route...'}
          </Text>
        </View>
      )}

      {/* Stats bar */}
      {routeResult && (
        <View style={[styles.statsBar, compact && styles.statsBarCompact]}>
          <View style={styles.statItem}>
            <Footprints size={16} color={colors.accent.primary} />
            <Text style={styles.statText}>
              {formatDistance(routeResult.totalDistance)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Clock size={16} color={colors.accent.primary} />
            <Text style={styles.statText}>
              {formatDuration(routeResult.totalDuration)} walking
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Route size={16} color={colors.accent.primary} />
            <Text style={styles.statText}>
              {activitiesWithCoords.length} stops
            </Text>
          </View>
        </View>
      )}

      {/* Action buttons */}
      {!compact && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.optimizeButton]}
            onPress={handleOptimizeRoute}
            disabled={isOptimizing || waypoints.length < 2}
          >
            {isOptimizing ? (
              <ActivityIndicator size="small" color={colors.accent.primary} />
            ) : (
              <Sparkles size={18} color={colors.accent.primary} />
            )}
            <Text style={styles.optimizeButtonText}>Optimize Route</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={handleStartDay}
            disabled={activitiesWithCoords.length === 0}
          >
            <Play size={18} color={colors.text.inverse} />
            <Text style={styles.startButtonText}>Start Day</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Compact mode buttons */}
      {compact && (
        <View style={styles.compactActions}>
          <TouchableOpacity
            style={styles.compactButton}
            onPress={handleOptimizeRoute}
            disabled={isOptimizing || waypoints.length < 2}
          >
            <Sparkles size={16} color={colors.accent.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.compactButton, styles.compactStartButton]}
            onPress={handleStartDay}
          >
            <Navigation size={16} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 350,
    borderRadius: borders.radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.background.secondary,
  },
  containerCompact: {
    height: 200,
    borderRadius: borders.radius.lg,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyContainer: {
    height: 200,
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyContainerCompact: {
    height: 150,
    borderRadius: borders.radius.lg,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.text.primary,
    ...shadows.md,
  },
  markerSelected: {
    transform: [{ scale: 1.2 }],
    borderColor: colors.accent.primary,
  },
  markerNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: '50%',
    transform: [{ translateX: -60 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    gap: spacing.sm,
    ...shadows.md,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  statsBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  statsBarCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border.default,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borders.radius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  optimizeButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  optimizeButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.accent.primary,
  },
  startButton: {
    backgroundColor: colors.accent.primary,
  },
  startButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
  compactActions: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  compactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent.primary,
    ...shadows.sm,
  },
  compactStartButton: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
});
