import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  ArrowLeft,
  Navigation as NavigationIcon,
  X,
  Car,
  Train,
  Footprints,
  CornerUpRight,
  MapPin,
} from 'lucide-react-native';
import { colors, spacing } from '../constants/theme';
import { getDirections, TravelMode } from '../services/routes';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useTripStore } from '../stores/useTripStore';
import { decodePolyline } from '../utils/polyline';
import type { TransitRoute, Coordinates } from '../types';

const { width, height } = Dimensions.get('window');

// Travel mode options
const TRAVEL_MODES: { mode: TravelMode; label: string; icon: typeof Car }[] = [
  { mode: 'WALK', label: 'Walk', icon: Footprints },
  { mode: 'TRANSIT', label: 'Transit', icon: Train },
  { mode: 'DRIVE', label: 'Drive', icon: Car },
];

// Calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Format distance for display
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Format duration for display
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function NavigationScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // Store state
  const currentDestination = useNavigationStore((state) => state.currentDestination);
  const startNavigation = useNavigationStore((state) => state.startNavigation);
  const markArrived = useNavigationStore((state) => state.markArrived);
  const exitCompanionMode = useNavigationStore((state) => state.exitCompanionMode);
  const coordinates = useLocationStore((state) => state.coordinates);
  const addVisit = useTripStore((state) => state.addVisit);

  // Local state
  const [route, setRoute] = useState<TransitRoute | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TravelMode>('WALK');
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Decode polyline for map
  const routeCoordinates = route?.polyline ? decodePolyline(route.polyline) : [];

  // Fetch route when destination is set or mode changes
  useEffect(() => {
    async function fetchRoute() {
      if (coordinates && currentDestination) {
        setIsLoadingRoute(true);
        console.log('[Navigation] Fetching route with mode:', selectedMode);
        console.log('[Navigation] From:', coordinates);
        console.log('[Navigation] To:', currentDestination.coordinates);

        const fetchedRoute = await getDirections(coordinates, currentDestination.coordinates, selectedMode);
        console.log('[Navigation] Route result:', fetchedRoute ? 'success' : 'failed');

        if (fetchedRoute) {
          setRoute(fetchedRoute);
          startNavigation(currentDestination, fetchedRoute);
          setCurrentStepIndex(0);
        }
        setIsLoadingRoute(false);
      }
    }
    fetchRoute();
  }, [currentDestination?.id, selectedMode]);

  // Fit map to show route
  useEffect(() => {
    if (mapRef.current && routeCoordinates.length > 0 && coordinates) {
      const allCoords = [
        coordinates,
        ...routeCoordinates,
        currentDestination?.coordinates,
      ].filter(Boolean) as Coordinates[];

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(allCoords, {
          edgePadding: { top: 150, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [routeCoordinates.length]);

  // Check for arrival
  useEffect(() => {
    if (coordinates && currentDestination && !hasArrived) {
      const distance = calculateDistance(
        coordinates.latitude,
        coordinates.longitude,
        currentDestination.coordinates.latitude,
        currentDestination.coordinates.longitude
      );

      // Check arrival (within 50 meters)
      if (distance < 50) {
        setHasArrived(true);
        markArrived();
      }
    }
  }, [coordinates, currentDestination, hasArrived]);

  const handleClose = () => {
    exitCompanionMode();
    router.back();
  };

  const handleModeChange = (mode: TravelMode) => {
    if (mode !== selectedMode) {
      setSelectedMode(mode);
      setRoute(null);
    }
  };

  const handleArrived = () => {
    if (currentDestination) {
      addVisit({
        placeId: currentDestination.id,
        name: currentDestination.title,
        neighborhood: currentDestination.neighborhood,
        city: '',
        country: '',
        coordinates: currentDestination.coordinates,
      });
    }
    exitCompanionMode();
    router.back();
  };

  // Empty state
  if (!currentDestination || !coordinates) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.emptyState}>
            <NavigationIcon size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No destination set</Text>
            <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
              <Text style={styles.goBackText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const currentStep = route?.steps[currentStepIndex];
  const distanceToDestination = coordinates && currentDestination
    ? calculateDistance(
        coordinates.latitude,
        coordinates.longitude,
        currentDestination.coordinates.latitude,
        currentDestination.coordinates.longitude
      )
    : null;

  return (
    <View style={styles.container}>
      {/* Full Screen Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation={!hasArrived}
        initialRegion={{
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Destination Marker */}
        <Marker
          coordinate={currentDestination.coordinates}
          title={currentDestination.title}
        >
          <View style={styles.destinationMarker}>
            <MapPin size={20} color="#FFFFFF" />
          </View>
        </Marker>

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={5}
            lineDashPattern={selectedMode === 'WALK' ? [1] : undefined}
          />
        )}
      </MapView>

      {/* Top Bar - Close button and destination */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.destinationInfo}>
          <Text style={styles.destinationName} numberOfLines={1}>
            {currentDestination.title}
          </Text>
          {route && (
            <Text style={styles.destinationMeta}>
              {formatDuration(route.totalDuration)} · {formatDistance(route.totalDistance)}
            </Text>
          )}
        </View>
      </SafeAreaView>

      {/* Travel Mode Selector */}
      <View style={styles.modeSelector}>
        {TRAVEL_MODES.map(({ mode, label, icon: Icon }) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeButton,
              selectedMode === mode && styles.modeButtonActive,
            ]}
            onPress={() => handleModeChange(mode)}
          >
            <Icon size={18} color={selectedMode === mode ? '#FFFFFF' : '#6B7280'} />
            <Text style={[
              styles.modeButtonText,
              selectedMode === mode && styles.modeButtonTextActive,
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading Overlay */}
      {isLoadingRoute && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Getting directions...</Text>
        </View>
      )}

      {/* Current Step Card - Google Maps style */}
      {currentStep && !hasArrived && (
        <View style={styles.stepCard}>
          <View style={styles.stepIconContainer}>
            <CornerUpRight size={24} color="#007AFF" />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepInstruction} numberOfLines={2}>
              {currentStep.instruction}
            </Text>
            {currentStep.distance && (
              <Text style={styles.stepDistance}>
                {formatDistance(currentStep.distance)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Arrived Card */}
      {hasArrived && (
        <View style={styles.arrivedCard}>
          <View style={styles.arrivedContent}>
            <Text style={styles.arrivedTitle}>You've arrived!</Text>
            <Text style={styles.arrivedSubtitle}>{currentDestination.title}</Text>
          </View>
          <TouchableOpacity style={styles.doneButton} onPress={handleArrived}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Info Bar */}
      {route && !hasArrived && (
        <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
          <View style={styles.bottomInfo}>
            <View>
              <Text style={styles.etaLabel}>ETA</Text>
              <Text style={styles.etaValue}>{formatDuration(route.totalDuration)}</Text>
            </View>
            <View style={styles.bottomDivider} />
            <View>
              <Text style={styles.etaLabel}>Distance</Text>
              <Text style={styles.etaValue}>{formatDistance(route.totalDistance)}</Text>
            </View>
            <View style={styles.bottomDivider} />
            <View>
              <Text style={styles.etaLabel}>Remaining</Text>
              <Text style={styles.etaValue}>
                {distanceToDestination ? formatDistance(distanceToDestination) : '--'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: spacing.lg,
  },
  goBackButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  goBackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  destinationInfo: {
    flex: 1,
    marginLeft: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  destinationMeta: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  modeSelector: {
    position: 'absolute',
    top: 120,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: '#6B7280',
  },
  stepCard: {
    position: 'absolute',
    bottom: 140,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#E3F2FD',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  stepInstruction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    lineHeight: 22,
  },
  stepDistance: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  arrivedCard: {
    position: 'absolute',
    bottom: 140,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: '#34C759',
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  arrivedContent: {
    flex: 1,
  },
  arrivedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  arrivedSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  doneButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  bottomDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  etaLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  etaValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginTop: 2,
  },
  destinationMarker: {
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    padding: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
