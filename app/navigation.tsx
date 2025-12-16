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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Camera } from 'react-native-maps';
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
} from 'lucide-react-native';
import { colors, spacing, borders, shadows, mapStyle, typography } from '../constants/theme';
import { getDirections, TravelMode } from '../services/routes';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useTripStore } from '../stores/useTripStore';
import { decodePolyline } from '../utils/polyline';
import { TypingIndicator } from '../components/TypingIndicator';
import type { TransitRoute, Coordinates } from '../types';

const { width, height } = Dimensions.get('window');

// Use Apple Maps on iOS (no Google branding) and Google Maps on Android
const MAP_PROVIDER = Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

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

  // Fit map and set tilted camera
  useEffect(() => {
    if (mapRef.current && routeCoordinates.length > 0 && coordinates) {
      const allCoords = [
        coordinates,
        ...routeCoordinates,
        currentDestination?.coordinates,
      ].filter(Boolean) as Coordinates[];

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(allCoords, {
          edgePadding: { top: 200, right: 50, bottom: 300, left: 50 },
          animated: true,
        });

        // Set tilted camera for walking perspective
        setTimeout(() => {
          if (coordinates) {
            const camera: Camera = {
              center: {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
              },
              pitch: 45, // Tilt the map
              heading: 0,
              zoom: 17,
              altitude: 500,
            };
            mapRef.current?.animateCamera(camera, { duration: 1000 });
          }
        }, 1000);
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

      if (distance < 50) {
        setHasArrived(true);
        markArrived();
        safeHaptics.notification(NotificationFeedbackType.Success);
      }
    }
  }, [coordinates, currentDestination, hasArrived]);

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

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    safeHaptics.impact(ImpactFeedbackStyle.Light);
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    // Simulate AI response (in real app, this would call the chat API)
    setTimeout(() => {
      const responses = [
        "I found a 7-Eleven about 2 minutes off your route. Want me to add it as a stop?",
        "There's a coffee shop on the way! Should I add it to your route?",
        "I can see a few options nearby. What are you looking for specifically?",
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      setChatMessages((prev) => [...prev, { role: 'assistant', text: response }]);
      setIsChatLoading(false);
      safeHaptics.notification(NotificationFeedbackType.Success);
    }, 1500);
  };

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

      {/* Full Screen Map with Tilt */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        customMapStyle={Platform.OS === 'android' ? mapStyle : undefined}
        userInterfaceStyle="dark"
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation={!hasArrived}
        showsCompass={false}
        pitchEnabled
        rotateEnabled
        initialRegion={{
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
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
              <Text style={styles.chatHint}>
                Ask me anything while navigating!{'\n'}
                "Where's the nearest 7-Eleven?"
              </Text>
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
              onSubmitEditing={handleChatSend}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.chatSendButton} onPress={handleChatSend}>
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
