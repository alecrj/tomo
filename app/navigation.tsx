import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Camera } from 'react-native-maps';
import { Magnetometer } from 'expo-sensors';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import {
  ArrowLeft,
  Navigation as NavigationIcon,
  X,
  Car,
  Train,
  Footprints,
  CornerUpRight,
  MapPin,
  MessageCircle,
  Send,
  ChevronUp,
  ChevronDown,
  Locate,
} from 'lucide-react-native';
import { colors, spacing, borders, shadows, mapStyle, typography } from '../constants/theme';
import { getDirections, TravelMode } from '../services/routes';
import { navigationChat, NavigationContext } from '../services/openai';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useTripStore } from '../stores/useTripStore';
import { decodePolyline } from '../utils/polyline';
import { TypingIndicator } from '../components/TypingIndicator';
import type { TransitRoute, Coordinates } from '../types';

const { width, height } = Dimensions.get('window');

// Use Google Maps everywhere for consistent experience
const MAP_PROVIDER = PROVIDER_GOOGLE;

const TRAVEL_MODES: { mode: TravelMode; label: string; icon: typeof Car }[] = [
  { mode: 'WALK', label: 'Walk', icon: Footprints },
  { mode: 'TRANSIT', label: 'Transit', icon: Train },
  { mode: 'DRIVE', label: 'Drive', icon: Car },
];

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

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

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

  const currentDestination = useNavigationStore((state) => state.currentDestination);
  const startNavigation = useNavigationStore((state) => state.startNavigation);
  const markArrived = useNavigationStore((state) => state.markArrived);
  const exitCompanionMode = useNavigationStore((state) => state.exitCompanionMode);
  const coordinates = useLocationStore((state) => state.coordinates);
  const addVisit = useTripStore((state) => state.addVisit);

  const [route, setRoute] = useState<TransitRoute | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TravelMode>('WALK');
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Compass heading for Google Maps-style navigation
  const [heading, setHeading] = useState(0);
  const [isFollowingUser, setIsFollowingUser] = useState(true);

  // Chat overlay state
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const routeCoordinates = route?.polyline ? decodePolyline(route.polyline) : [];

  // Fetch route
  useEffect(() => {
    async function fetchRoute() {
      if (coordinates && currentDestination) {
        setIsLoadingRoute(true);
        safeHaptics.impact(ImpactFeedbackStyle.Light);

        const fetchedRoute = await getDirections(
          coordinates,
          currentDestination.coordinates,
          selectedMode
        );

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

  // Subscribe to compass heading for Google Maps-style navigation
  // Reduced from 100ms (10x/sec) to 300ms (3x/sec) to prevent excessive re-renders
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let lastHeading = 0;

    const subscribe = async () => {
      // Update heading 3 times per second (was 10x/sec - too frequent)
      Magnetometer.setUpdateInterval(300);
      subscription = Magnetometer.addListener((data: { x: number; y: number; z: number }) => {
        // Calculate heading from magnetometer data
        let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
        // Normalize to 0-360
        if (angle < 0) angle += 360;
        // Invert for map rotation (map rotates opposite to device)
        const newHeading = 360 - angle;

        // Only update if heading changed significantly (> 5 degrees)
        // This prevents jittery updates from small sensor noise
        if (Math.abs(newHeading - lastHeading) > 5) {
          lastHeading = newHeading;
          setHeading(newHeading);
        }
      });
    };

    subscribe();

    return () => {
      subscription?.remove();
    };
  }, []);

  // Google Maps-style camera: behind user, looking forward, rotates with heading
  useEffect(() => {
    if (isFollowingUser && coordinates && mapRef.current && !hasArrived && route) {
      // Offset camera center to put user at bottom 1/3 of screen
      // This makes it feel like you're looking ahead, not down at yourself
      const OFFSET_DISTANCE = 0.0006; // ~60-70 meters ahead
      const headingRad = (heading * Math.PI) / 180;

      const offsetLat = coordinates.latitude + OFFSET_DISTANCE * Math.cos(headingRad);
      const offsetLng = coordinates.longitude + OFFSET_DISTANCE * Math.sin(headingRad);

      const camera: Camera = {
        center: {
          latitude: offsetLat,
          longitude: offsetLng,
        },
        pitch: 60, // High tilt for street-level feel
        heading: heading, // Rotate with device compass
        zoom: 18, // Close zoom to see street details
        altitude: 300, // Low altitude
      };

      mapRef.current.animateCamera(camera, { duration: 300 });
    }
  }, [coordinates, heading, isFollowingUser, hasArrived, route]);

  // Initial camera setup when route loads
  useEffect(() => {
    if (mapRef.current && routeCoordinates.length > 0 && coordinates && !hasArrived) {
      // Start in navigation mode immediately
      setIsFollowingUser(true);
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

      if (distance < 50) {
        setHasArrived(true);
        markArrived();
        safeHaptics.notification(NotificationFeedbackType.Success);
      }
    }
  }, [coordinates, currentDestination, hasArrived]);

  // Progressive step advancement based on distance traveled
  useEffect(() => {
    if (!coordinates || !route?.steps || hasArrived || !currentDestination) return;

    const totalDistance = route.totalDistance;
    const distanceToDestination = calculateDistance(
      coordinates.latitude,
      coordinates.longitude,
      currentDestination.coordinates.latitude,
      currentDestination.coordinates.longitude
    );

    // Calculate progress (0 to 1)
    const progress = 1 - distanceToDestination / totalDistance;

    // Map progress to step index
    const stepCount = route.steps.length;
    const expectedStepIndex = Math.min(
      Math.floor(progress * stepCount),
      stepCount - 1
    );

    // Only advance forward, never go back
    if (expectedStepIndex > currentStepIndex) {
      setCurrentStepIndex(expectedStepIndex);
      safeHaptics.impact(ImpactFeedbackStyle.Light);
    }
  }, [coordinates, route, currentStepIndex, hasArrived, currentDestination]);

  const handleClose = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    exitCompanionMode();
    router.back();
  };

  const handleModeChange = (mode: TravelMode) => {
    if (mode !== selectedMode) {
      safeHaptics.selection();
      setSelectedMode(mode);
      setRoute(null);
    }
  };

  // Handle user panning the map - disable follow mode
  const handleMapPanDrag = () => {
    setIsFollowingUser(false);
  };

  // Re-center on user position
  const handleRecenter = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    setIsFollowingUser(true);
  };

  const handleArrived = () => {
    safeHaptics.notification(NotificationFeedbackType.Success);
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

  const handleChatSend = async (message?: string) => {
    const userMessage = (message || chatInput).trim();
    if (!userMessage) return;

    safeHaptics.impact(ImpactFeedbackStyle.Light);
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      // Build navigation context for AI
      const navContext: NavigationContext = {
        userLocation: coordinates!,
        destination: {
          name: currentDestination!.title,
          address: currentDestination!.address || '',
          coordinates: currentDestination!.coordinates,
        },
        currentStep: currentStep ? {
          instruction: currentStep.instruction,
          distance: currentStep.distance,
        } : undefined,
        totalDuration: route?.totalDuration || 0,
        totalDistance: route?.totalDistance || 0,
        distanceRemaining: distanceToDestination || route?.totalDistance || 0,
        travelMode: selectedMode,
      };

      const response = await navigationChat(userMessage, navContext);
      setChatMessages((prev) => [...prev, { role: 'assistant', text: response.text }]);

      // Handle actions from the response
      if (response.action?.type === 'add_stop' && response.action.place) {
        // TODO: Implement waypoint/stop addition
        console.log('[Navigation] Add stop suggested:', response.action.place);
      }

      safeHaptics.notification(NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Navigation] Chat error:', error);
      setChatMessages((prev) => [...prev, {
        role: 'assistant',
        text: "Sorry, I couldn't process that. Try again in a moment."
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Quick action chips for navigation
  const QUICK_ACTIONS = [
    { label: 'Pit stop', message: 'Find me a quick pit stop nearby' },
    { label: 'Bathroom', message: 'Where is the nearest bathroom?' },
    { label: 'Coffee', message: 'Find a coffee shop on my route' },
    { label: 'How long?', message: 'How much longer until I arrive?' },
  ];

  if (!currentDestination || !coordinates) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.emptyState}>
            <NavigationIcon size={48} color={colors.text.tertiary} />
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
  const distanceToDestination =
    coordinates && currentDestination
      ? calculateDistance(
          coordinates.latitude,
          coordinates.longitude,
          currentDestination.coordinates.latitude,
          currentDestination.coordinates.longitude
        )
      : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Full Screen Map - Google Maps style navigation */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        customMapStyle={Platform.OS === 'android' ? mapStyle : undefined}
        userInterfaceStyle="dark"
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        pitchEnabled
        rotateEnabled
        scrollEnabled
        onPanDrag={handleMapPanDrag}
        initialRegion={{
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        {/* Destination Marker */}
        <Marker coordinate={currentDestination.coordinates} title={currentDestination.title}>
          <View style={styles.destinationMarker}>
            <MapPin size={20} color={colors.text.primary} />
          </View>
        </Marker>

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.map.route}
            strokeWidth={5}
            lineDashPattern={selectedMode === 'WALK' ? [1] : undefined}
          />
        )}
      </MapView>

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={24} color={colors.text.primary} />
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
            style={[styles.modeButton, selectedMode === mode && styles.modeButtonActive]}
            onPress={() => handleModeChange(mode)}
          >
            <Icon size={18} color={selectedMode === mode ? colors.text.inverse : colors.text.secondary} />
            <Text
              style={[styles.modeButtonText, selectedMode === mode && styles.modeButtonTextActive]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading Overlay */}
      {isLoadingRoute && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Getting directions...</Text>
        </View>
      )}

      {/* Re-center button - shows when user pans away */}
      {!isFollowingUser && !hasArrived && (
        <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter}>
          <Locate size={22} color={colors.accent.primary} />
        </TouchableOpacity>
      )}

      {/* Chat Overlay Toggle */}
      <TouchableOpacity
        style={[styles.chatToggle, showChat && styles.chatToggleActive]}
        onPress={() => {
          safeHaptics.impact(ImpactFeedbackStyle.Light);
          setShowChat(!showChat);
        }}
      >
        <MessageCircle size={20} color={showChat ? colors.text.inverse : colors.accent.primary} />
      </TouchableOpacity>

      {/* Chat Overlay */}
      {showChat && (
        <KeyboardAvoidingView
          style={styles.chatOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Ask Tomo</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <ChevronDown size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.chatMessages}>
            {chatMessages.length === 0 && (
              <>
                <Text style={styles.chatHint}>
                  Ask me anything while navigating!
                </Text>
                <View style={styles.quickActionsContainer}>
                  {QUICK_ACTIONS.map((action) => (
                    <TouchableOpacity
                      key={action.label}
                      style={styles.quickActionChip}
                      onPress={() => handleChatSend(action.message)}
                    >
                      <Text style={styles.quickActionText}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {chatMessages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.chatBubble,
                  msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.chatBubbleText,
                    msg.role === 'user' ? styles.chatBubbleTextUser : styles.chatBubbleTextAssistant,
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            ))}
            {isChatLoading && <TypingIndicator size="small" />}
          </View>

          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Ask something..."
              placeholderTextColor={colors.text.tertiary}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={() => handleChatSend()}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.chatSendButton} onPress={() => handleChatSend()}>
              <Send size={16} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Current Step Card */}
      {currentStep && !hasArrived && !showChat && (
        <View style={styles.stepCard}>
          <View style={styles.stepIconContainer}>
            <CornerUpRight size={24} color={colors.accent.primary} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepInstruction} numberOfLines={2}>
              {currentStep.instruction}
            </Text>
            {currentStep.distance && (
              <Text style={styles.stepDistance}>{formatDistance(currentStep.distance)}</Text>
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
      {route && !hasArrived && !showChat && (
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
    backgroundColor: colors.background.primary,
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
    backgroundColor: colors.background.primary,
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    marginTop: spacing.lg,
  },
  goBackButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.md,
  },
  goBackText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
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
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  destinationInfo: {
    flex: 1,
    marginLeft: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  destinationName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  destinationMeta: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  modeSelector: {
    position: 'absolute',
    top: 120,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.md,
    padding: 4,
    ...shadows.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.sm,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: colors.accent.primary,
  },
  modeButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  modeButtonTextActive: {
    color: colors.text.inverse,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface.modalOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  recenterButton: {
    position: 'absolute',
    top: 180,
    left: spacing.md,
    width: 48,
    height: 48,
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  chatToggle: {
    position: 'absolute',
    top: 180,
    right: spacing.md,
    width: 48,
    height: 48,
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  chatToggleActive: {
    backgroundColor: colors.accent.primary,
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borders.radius.xl,
    borderTopRightRadius: borders.radius.xl,
    maxHeight: height * 0.5,
    ...shadows.lg,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  chatTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  chatMessages: {
    padding: spacing.md,
    minHeight: 100,
    maxHeight: 200,
  },
  chatHint: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  quickActionChip: {
    backgroundColor: colors.accent.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
  },
  quickActionText: {
    fontSize: typography.sizes.sm,
    color: colors.accent.primary,
    fontWeight: typography.weights.medium,
  },
  chatBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.lg,
    marginBottom: spacing.sm,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.chat.userBubble,
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.chat.assistantBubble,
  },
  chatBubbleText: {
    fontSize: typography.sizes.sm,
  },
  chatBubbleTextUser: {
    color: colors.chat.userText,
  },
  chatBubbleTextAssistant: {
    color: colors.chat.assistantText,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
    gap: spacing.sm,
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.surface.input,
    borderRadius: borders.radius.full,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
  },
  chatSendButton: {
    width: 36,
    height: 36,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCard: {
    position: 'absolute',
    bottom: 140,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    ...shadows.lg,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: colors.accent.muted,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  stepInstruction: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    lineHeight: 22,
  },
  stepDistance: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: 4,
  },
  arrivedCard: {
    position: 'absolute',
    bottom: 140,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.status.success,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.lg,
  },
  arrivedContent: {
    flex: 1,
  },
  arrivedTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  arrivedSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  doneButton: {
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.md,
  },
  doneButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.status.success,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borders.radius.xl,
    borderTopRightRadius: borders.radius.xl,
    ...shadows.lg,
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
    backgroundColor: colors.border.default,
  },
  etaLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  etaValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 2,
  },
  destinationMarker: {
    backgroundColor: colors.map.marker,
    borderRadius: borders.radius.full,
    padding: 8,
    borderWidth: 3,
    borderColor: colors.text.primary,
    ...shadows.md,
  },
});
