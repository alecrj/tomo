import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowLeft, Navigation as NavigationIcon, Train, Bus, Clock, AlertTriangle } from 'lucide-react-native';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { useLocationStore } from '../stores/useLocationStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useWarningsStore } from '../stores/useWarningsStore';
import { getMinutesUntilLastTrain } from '../services/routes';
import { decodePolyline } from '../utils/polyline';
import type { Destination, TransitRoute, TransitStep } from '../types';

/**
 * Navigation Screen
 * Shows map with route, step-by-step instructions, and proactive warnings
 */
export default function NavigationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse route params
  const destination: Destination | null = params.destination ? JSON.parse(params.destination as string) : null;
  const route: TransitRoute | null = params.route ? JSON.parse(params.route as string) : null;

  // Store state
  const coordinates = useLocationStore((state) => state.coordinates);
  const markArrived = useNavigationStore((state) => state.markArrived);
  const addWarning = useWarningsStore((state) => state.addWarning);
  const warnings = useWarningsStore((state) => state.getActiveWarnings());

  // Local state
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [arrivalDetected, setArrivalDetected] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Decode polyline for map display
  const polylineCoords = route ? decodePolyline(route.polyline) : [];

  // Check for last train warning
  useEffect(() => {
    if (!route) return;

    const minutesUntilLastTrain = getMinutesUntilLastTrain(route);

    if (minutesUntilLastTrain !== null) {
      // Add warning at 90, 60, and 30 minutes
      if (minutesUntilLastTrain <= 90 && minutesUntilLastTrain > 60) {
        addWarning({
          id: `last-train-90-${Date.now()}`,
          type: 'last_train',
          severity: 'info',
          message: `Last train in ${minutesUntilLastTrain} minutes. Plan your return.`,
          dismissed: false,
        });
      } else if (minutesUntilLastTrain <= 60 && minutesUntilLastTrain > 30) {
        addWarning({
          id: `last-train-60-${Date.now()}`,
          type: 'last_train',
          severity: 'warning',
          message: `⚠️ Last train in ${minutesUntilLastTrain} minutes.`,
          action: 'View directions home',
          actionType: 'navigate_home',
          dismissed: false,
        });
      } else if (minutesUntilLastTrain <= 30) {
        addWarning({
          id: `last-train-30-${Date.now()}`,
          type: 'last_train',
          severity: 'urgent',
          message: `🚨 URGENT: Last train in ${minutesUntilLastTrain} minutes!`,
          action: 'Get directions home',
          actionType: 'navigate_home',
          dismissed: false,
        });
      }
    }
  }, [route, addWarning]);

  // Arrival detection (simple distance-based for now)
  useEffect(() => {
    if (!coordinates || !destination || arrivalDetected) return;

    const distance = calculateDistance(
      coordinates.latitude,
      coordinates.longitude,
      destination.coordinates.latitude,
      destination.coordinates.longitude
    );

    // If within 50 meters, mark as arrived
    if (distance < 50) {
      setArrivalDetected(true);
      Alert.alert(
        '🎉 You\'ve arrived!',
        `Welcome to ${destination.title}`,
        [
          {
            text: 'Start exploring',
            onPress: () => {
              markArrived();
              router.push('/companion');
            },
          },
        ]
      );
    }
  }, [coordinates, destination, arrivalDetected, markArrived, router]);

  // Fit map to route on mount
  useEffect(() => {
    if (mapRef.current && polylineCoords.length > 0) {
      mapRef.current.fitToCoordinates(polylineCoords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [polylineCoords]);

  if (!destination || !route) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Navigation data not available</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const urgentWarnings = warnings.filter(w => w.severity === 'urgent');

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: coordinates?.latitude || destination.coordinates.latitude,
          longitude: coordinates?.longitude || destination.coordinates.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton
        followsUserLocation
      >
        {/* Route polyline */}
        {polylineCoords.length > 0 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={colors.interactive.primary}
            strokeWidth={4}
          />
        )}

        {/* Destination marker */}
        <Marker
          coordinate={destination.coordinates}
          title={destination.title}
          description={destination.description}
        />
      </MapView>

      {/* Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={[styles.headerContent, shadows.lg]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text.light.primary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{destination.title}</Text>
            <Text style={styles.headerSubtitle}>
              {route.totalDuration} min · {(route.totalDistance / 1000).toFixed(1)} km
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Urgent warnings banner */}
      {urgentWarnings.length > 0 && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={20} color={colors.status.error} />
          <Text style={styles.warningText}>{urgentWarnings[0].message}</Text>
        </View>
      )}

      {/* Instructions panel */}
      <View style={styles.instructionsPanel}>
        <View style={styles.panelHeader}>
          <NavigationIcon size={20} color={colors.interactive.primary} />
          <Text style={styles.panelTitle}>Directions</Text>
        </View>

        <ScrollView
          style={styles.stepsList}
          contentContainerStyle={styles.stepsContent}
          showsVerticalScrollIndicator={false}
        >
          {route.steps.map((step, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.stepItem,
                index === selectedStepIndex && styles.stepItemSelected,
              ]}
              onPress={() => setSelectedStepIndex(index)}
            >
              <View style={styles.stepIcon}>
                {getStepIcon(step)}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepInstruction}>{step.instruction}</Text>
                {step.details && (
                  <Text style={styles.stepDetails}>{step.details}</Text>
                )}
                <View style={styles.stepMeta}>
                  <Clock size={14} color={colors.text.light.tertiary} />
                  <Text style={styles.stepMetaText}>
                    {Math.round(step.duration)} min
                  </Text>
                  {step.distance && (
                    <Text style={styles.stepMetaText}>
                      · {(step.distance / 1000).toFixed(1)} km
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// Helper: Get icon for transit step
function getStepIcon(step: TransitStep) {
  switch (step.mode) {
    case 'train':
      return <Train size={20} color={colors.interactive.primary} />;
    case 'bus':
      return <Bus size={20} color={colors.interactive.primary} />;
    case 'walk':
      return <NavigationIcon size={20} color={colors.text.light.tertiary} />;
    default:
      return <NavigationIcon size={20} color={colors.text.light.tertiary} />;
  }
}

// Helper: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
    marginTop: 2,
  },
  warningBanner: {
    position: 'absolute',
    top: 120,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.status.error,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 8,
    ...shadows.md,
  },
  warningText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.surface.card,
  },
  instructionsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    ...shadows.lg,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  panelTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginLeft: spacing.sm,
  },
  stepsList: {
    flex: 1,
  },
  stepsContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  stepItem: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepItemSelected: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  stepIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.light.primary,
    marginBottom: 4,
  },
  stepDetails: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
    marginBottom: 4,
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stepMetaText: {
    fontSize: typography.sizes.xs,
    color: colors.text.light.tertiary,
    marginLeft: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.text.light.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.interactive.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.surface.card,
  },
});
