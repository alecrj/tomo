import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Camera } from 'react-native-maps';
import * as Location from 'expo-location';
// Speech is optional - requires native rebuild
let Speech: any = null;
try {
  Speech = require('expo-speech');
} catch (e) {
  console.log('expo-speech not available - voice guidance disabled');
}
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  X,
  ChevronUp,
  ChevronDown,
  Locate,
  Map,
  MessageCircle,
  Send,
  MapPin,
  Plus,
  Navigation2,
  Clock,
  Route,
  Volume2,
  VolumeX,
  Car,
  Train,
  Footprints,
  Compass,
  List,
  Check,
  Layers,
} from 'lucide-react-native';
import { colors, spacing, borders, shadows, typography } from '../constants/theme';
import { getDirections, getMultiWaypointRoute, TravelMode } from '../services/routes';
import { smartNavigationChat, NavigationContext, NearbyPlace, SmartNavigationResponse } from '../services/openai';
import { searchNearby } from '../services/places';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useTripStore } from '../stores/useTripStore';
import { decodePolyline } from '../utils/polyline';
import { TypingIndicator } from '../components/TypingIndicator';
import type { TransitRoute, Coordinates } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_PROVIDER = PROVIDER_DEFAULT;

// Helper functions
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
    return `${Math.round(meters)}`;
  }
  return `${(meters / 1000).toFixed(1)}`;
}

function formatDistanceUnit(meters: number): string {
  return meters < 1000 ? 'm' : 'km';
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatArrivalTime(minutes: number): string {
  const arrival = new Date();
  arrival.setMinutes(arrival.getMinutes() + Math.round(minutes));
  return arrival.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Get icon based on step mode and instruction
function getStepIcon(step: { mode: string; instruction: string }): React.ReactNode {
  const iconSize = 32;
  const iconColor = colors.text.primary;

  // Transit modes
  if (step.mode === 'train') {
    return <Train size={iconSize} color={iconColor} />;
  }
  if (step.mode === 'bus') {
    return <Car size={iconSize} color={iconColor} />; // Use Car as bus icon
  }

  // Walking maneuvers
  const lower = step.instruction.toLowerCase();

  if (lower.includes('turn left') || lower.includes('left onto')) {
    return <CornerUpLeft size={iconSize} color={iconColor} />;
  }
  if (lower.includes('turn right') || lower.includes('right onto')) {
    return <CornerUpRight size={iconSize} color={iconColor} />;
  }
  if (lower.includes('slight left') || lower.includes('bear left')) {
    return <ArrowUpLeft size={iconSize} color={iconColor} />;
  }
  if (lower.includes('slight right') || lower.includes('bear right')) {
    return <ArrowUpRight size={iconSize} color={iconColor} />;
  }
  if (lower.includes('u-turn') || lower.includes('make a u')) {
    return <RotateCcw size={iconSize} color={iconColor} />;
  }
  if (lower.includes('destination') || lower.includes('arrive')) {
    return <MapPin size={iconSize} color={iconColor} />;
  }
  // Default: continue straight / walking
  return <Footprints size={iconSize} color={iconColor} />;
}

// Extract street name from instruction
function extractStreetName(instruction: string): string {
  // Remove HTML tags
  const clean = instruction.replace(/<[^>]*>/g, '');

  // Common patterns: "Turn left onto Main St" -> "Main St"
  const ontoMatch = clean.match(/onto\s+(.+?)(?:\.|$)/i);
  if (ontoMatch) return ontoMatch[1].trim();

  // "Continue on Main St" -> "Main St"
  const continueMatch = clean.match(/continue\s+(?:on\s+)?(.+?)(?:\.|$)/i);
  if (continueMatch) return continueMatch[1].trim();

  // "Head north on Main St" -> "Main St"
  const headMatch = clean.match(/head\s+\w+\s+on\s+(.+?)(?:\.|$)/i);
  if (headMatch) return headMatch[1].trim();

  // Just return the clean instruction
  return clean;
}

// Quick action interface
interface QuickAction {
  label: string;
  message: string;
  icon: React.ReactNode;
}

export default function NavigationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  // Store state
  const currentDestination = useNavigationStore((state) => state.currentDestination);
  const startNavigation = useNavigationStore((state) => state.startNavigation);
  const markArrived = useNavigationStore((state) => state.markArrived);
  const exitCompanionMode = useNavigationStore((state) => state.exitCompanionMode);
  const addWaypoint = useNavigationStore((state) => state.addWaypoint);
  const waypoints = useNavigationStore((state) => state.waypoints);
  const coordinates = useLocationStore((state) => state.coordinates);
  const addVisit = useTripStore((state) => state.addVisit);

  // Local state
  const [route, setRoute] = useState<TransitRoute | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [heading, setHeading] = useState(0);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>('WALK');
  const [lastSpokenStep, setLastSpokenStep] = useState(-1);
  const [bearingToDestination, setBearingToDestination] = useState(0);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant';
    text: string;
    places?: NearbyPlace[];
    actions?: SmartNavigationResponse['suggestedActions'];
  }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSlideAnim = useRef(new Animated.Value(0)).current;

  // Step list expansion state
  const [showStepList, setShowStepList] = useState(false);
  const stepListAnim = useRef(new Animated.Value(0)).current;

  const routeCoordinates = route?.polyline ? decodePolyline(route.polyline) : [];

  // Calculate bearing from user to destination
  const calculateBearing = useCallback((from: Coordinates, to: Coordinates): number => {
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360;
    return bearing;
  }, []);

  // Fetch route on mount and when travel mode changes
  useEffect(() => {
    async function fetchRoute() {
      if (coordinates && currentDestination?.coordinates) {
        // Extract plain coordinate values (avoid Zustand proxy issues)
        const fromCoords = {
          latitude: Number(coordinates.latitude),
          longitude: Number(coordinates.longitude),
        };
        const toCoords = {
          latitude: Number(currentDestination.coordinates.latitude),
          longitude: Number(currentDestination.coordinates.longitude),
        };

        // Debug: Log coordinates being used
        console.log('[Navigation] Fetching route:', {
          from: fromCoords,
          to: toCoords,
          destination: currentDestination.title,
          mode: travelMode,
        });

        setIsLoadingRoute(true);
        safeHaptics.impact(ImpactFeedbackStyle.Light);

        const fetchedRoute = await getDirections(
          fromCoords,
          toCoords,
          travelMode
        );

        if (fetchedRoute) {
          // Debug: Log route result
          console.log('[Navigation] Route result:', {
            duration: fetchedRoute.totalDuration,
            distance: fetchedRoute.totalDistance,
            steps: fetchedRoute.steps?.length,
          });

          setRoute(fetchedRoute);
          startNavigation(currentDestination, fetchedRoute);
          setCurrentStepIndex(0);
          setLastSpokenStep(-1);
        } else {
          console.log('[Navigation] No route returned');
        }
        setIsLoadingRoute(false);
      }
    }
    fetchRoute();
  }, [currentDestination?.id, travelMode]);

  // Recalculate route when waypoints change
  useEffect(() => {
    async function recalculateRoute() {
      if (!coordinates || !currentDestination?.coordinates || waypoints.length === 0) return;

      setIsLoadingRoute(true);
      safeHaptics.impact(ImpactFeedbackStyle.Light);

      // Build waypoint array with plain coordinates (avoid Zustand proxy issues)
      const allPoints = [
        { latitude: Number(coordinates.latitude), longitude: Number(coordinates.longitude) },
        ...waypoints.map(w => ({
          latitude: Number(w.coordinates.latitude),
          longitude: Number(w.coordinates.longitude),
        })),
        {
          latitude: Number(currentDestination.coordinates.latitude),
          longitude: Number(currentDestination.coordinates.longitude),
        },
      ];

      const newRoute = await getMultiWaypointRoute(allPoints);

      if (newRoute) {
        // Convert to TransitRoute format
        const updatedRoute = {
          steps: [{
            mode: 'walk' as const,
            instruction: 'Follow route through all stops',
            duration: newRoute.totalDuration,
            distance: newRoute.totalDistance,
          }],
          totalDuration: newRoute.totalDuration,
          totalDistance: newRoute.totalDistance,
          polyline: newRoute.polyline,
        };
        setRoute(updatedRoute);
        useNavigationStore.getState().updateRoute(updatedRoute);
      }

      setIsLoadingRoute(false);
    }

    recalculateRoute();
  }, [waypoints.length]);

  // Compass heading subscription using expo-location (same as Apple/Google Maps)
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let lastHeading = 0;

    const subscribe = async () => {
      try {
        // Use expo-location's heading which is properly calibrated
        // This is the same API that Apple Maps and Google Maps use internally
        subscription = await Location.watchHeadingAsync((headingData) => {
          // trueHeading is relative to true north (accounts for magnetic declination)
          // magHeading is relative to magnetic north
          // Use trueHeading when available, fallback to magHeading
          const newHeading = headingData.trueHeading >= 0
            ? headingData.trueHeading
            : headingData.magHeading;

          // Only update if heading changed significantly (reduces jitter)
          if (Math.abs(newHeading - lastHeading) > 3) {
            lastHeading = newHeading;
            setHeading(newHeading);
          }
        });
      } catch (error) {
        console.log('[Navigation] Heading subscription error:', error);
      }
    };

    subscribe();
    return () => subscription?.remove();
  }, []);

  // Camera follow - navigation mode
  useEffect(() => {
    if (isFollowingUser && !isOverviewMode && coordinates && mapRef.current && !hasArrived && route) {
      const OFFSET_DISTANCE = 0.0006;
      const safeHeading = isNaN(heading) ? 0 : heading;
      const headingRad = (safeHeading * Math.PI) / 180;

      const offsetLat = coordinates.latitude + OFFSET_DISTANCE * Math.cos(headingRad);
      const offsetLng = coordinates.longitude + OFFSET_DISTANCE * Math.sin(headingRad);

      const camera: Camera = {
        center: { latitude: offsetLat, longitude: offsetLng },
        pitch: 60,
        heading: isNaN(heading) ? 0 : heading,
        zoom: 18,
        altitude: 300,
      };

      mapRef.current.animateCamera(camera, { duration: 300 });
    }
  }, [coordinates, heading, isFollowingUser, isOverviewMode, hasArrived, route]);

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

        // Announce arrival
        if (!isMuted && Speech) {
          Speech.speak(`You have arrived at ${currentDestination.title}`, {
            language: 'en-US',
            pitch: 1.0,
            rate: 0.9,
          });
        }
      }
    }
  }, [coordinates, currentDestination, hasArrived]);

  // Step advancement
  useEffect(() => {
    if (!coordinates || !route?.steps || hasArrived || !currentDestination) return;

    const distanceToDestination = calculateDistance(
      coordinates.latitude,
      coordinates.longitude,
      currentDestination.coordinates.latitude,
      currentDestination.coordinates.longitude
    );

    const progress = 1 - distanceToDestination / route.totalDistance;
    const expectedStepIndex = Math.min(
      Math.floor(progress * route.steps.length),
      route.steps.length - 1
    );

    if (expectedStepIndex > currentStepIndex) {
      setCurrentStepIndex(expectedStepIndex);
      safeHaptics.impact(ImpactFeedbackStyle.Light);
    }
  }, [coordinates, route, currentStepIndex, hasArrived, currentDestination]);

  // Update bearing to destination
  useEffect(() => {
    if (coordinates && currentDestination) {
      const bearing = calculateBearing(coordinates, currentDestination.coordinates);
      setBearingToDestination(bearing);
    }
  }, [coordinates, currentDestination, calculateBearing]);

  // Voice guidance - speak turn instructions
  useEffect(() => {
    if (!Speech || isMuted || !route?.steps || hasArrived) return;
    if (currentStepIndex === lastSpokenStep) return;

    const currentStep = route.steps[currentStepIndex];
    if (currentStep) {
      // Clean up HTML tags from instruction
      const instruction = currentStep.instruction.replace(/<[^>]*>/g, '');

      // Speak the instruction
      Speech.speak(instruction, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
      });

      setLastSpokenStep(currentStepIndex);
    }
  }, [currentStepIndex, route, isMuted, hasArrived, lastSpokenStep]);

  // Stop speech when arriving or leaving
  useEffect(() => {
    return () => {
      if (Speech) Speech.stop();
    };
  }, []);

  // Chat panel animation
  useEffect(() => {
    Animated.timing(chatSlideAnim, {
      toValue: showChat ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showChat]);

  // Step list animation
  useEffect(() => {
    Animated.timing(stepListAnim, {
      toValue: showStepList ? 1 : 0,
      duration: 250,
      useNativeDriver: false, // Can't use native driver for height
    }).start();
  }, [showStepList]);

  // Toggle step list
  const toggleStepList = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    setShowStepList(!showStepList);
  };

  // Travel mode change handler
  const handleTravelModeChange = (mode: TravelMode) => {
    if (mode === travelMode) return;
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    if (Speech) Speech.stop();
    setTravelMode(mode);
    setLastSpokenStep(-1);
  };

  // Handlers
  const handleEndRoute = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    if (Speech) Speech.stop();
    exitCompanionMode();
    router.back();
  };

  const handleRecenter = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    setIsFollowingUser(true);
    setIsOverviewMode(false);
  };

  const handleOverview = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    setIsOverviewMode(true);
    setIsFollowingUser(false);

    if (mapRef.current && routeCoordinates.length > 0 && coordinates) {
      const allCoords = [coordinates, ...routeCoordinates];
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      });
    }
  };

  const handleMapPanDrag = () => {
    setIsFollowingUser(false);
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

  // Smart chat handler with place search
  const handleChatSend = async (message?: string) => {
    const userMessage = (message || chatInput).trim();
    if (!userMessage) return;

    safeHaptics.impact(ImpactFeedbackStyle.Light);
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const distanceRemaining = currentDestination && coordinates
        ? calculateDistance(
            coordinates.latitude,
            coordinates.longitude,
            currentDestination.coordinates.latitude,
            currentDestination.coordinates.longitude
          )
        : route?.totalDistance || 0;

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
        distanceRemaining,
        travelMode: 'WALK',
        waypoints: waypoints.map((w) => ({
          name: w.name,
          coordinates: w.coordinates,
        })),
      };

      // Search function for smart chat
      const searchPlaces = async (
        query: string,
        coords: Coordinates,
        type?: string
      ): Promise<NearbyPlace[]> => {
        const results = await searchNearby(coords, query, type, 1000);
        return results.map((place) => ({
          id: place.id,
          name: place.displayName.text,
          address: place.formattedAddress,
          coordinates: {
            latitude: place.location.latitude,
            longitude: place.location.longitude,
          },
          rating: place.rating,
          isOpen: place.regularOpeningHours?.openNow,
        }));
      };

      const response = await smartNavigationChat(userMessage, navContext, searchPlaces);

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: response.text,
          places: response.places,
          actions: response.suggestedActions,
        },
      ]);

      safeHaptics.notification(NotificationFeedbackType.Success);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: "Sorry, I couldn't process that. Try again." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle action button press (add stop, change destination, etc.)
  const handleActionPress = (action: { label: string; type: string; placeId?: string }, places?: NearbyPlace[]) => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);

    if (action.type === 'add_stop' && action.placeId && places) {
      const place = places.find((p) => p.id === action.placeId);
      if (place) {
        addWaypoint({
          name: place.name,
          address: place.address,
          coordinates: place.coordinates,
          addedTime: place.detourTime,
        });
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `Added ${place.name} as a stop. Your route has been updated.` },
        ]);
      }
    } else if (action.type === 'dismiss') {
      // Just close the chat
      setShowChat(false);
    }
  };

  // Quick actions
  const QUICK_ACTIONS: QuickAction[] = [
    { label: 'Bathroom', message: "Where's the nearest bathroom?", icon: <MapPin size={14} color={colors.accent.primary} /> },
    { label: 'Coffee', message: 'Find me a coffee shop', icon: <MapPin size={14} color={colors.accent.primary} /> },
    { label: '7-Eleven', message: "Where's the nearest 7-Eleven?", icon: <MapPin size={14} color={colors.accent.primary} /> },
    { label: 'How long?', message: 'How much longer until I arrive?', icon: <Clock size={14} color={colors.accent.primary} /> },
  ];

  // Empty state
  if (!currentDestination || !coordinates) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.emptyState}>
          <Navigation2 size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyText}>No destination set</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
            <Text style={styles.goBackText}>Go back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const currentStep = route?.steps[currentStepIndex];
  const distanceToDestination = calculateDistance(
    coordinates.latitude,
    coordinates.longitude,
    currentDestination.coordinates.latitude,
    currentDestination.coordinates.longitude
  );
  // Show route's actual duration (matches what chat showed)
  // This is more accurate than estimating based on straight-line distance
  const etaMinutes = route ? Math.round(route.totalDuration) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={MAP_PROVIDER}
        mapType={mapType === 'standard' ? 'mutedStandard' : mapType}
        userInterfaceStyle="dark"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
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
        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <>
            <Polyline coordinates={routeCoordinates} strokeColor="#000000" strokeWidth={10} />
            <Polyline coordinates={routeCoordinates} strokeColor="#4285F4" strokeWidth={6} />
          </>
        )}

        {/* Custom user location marker with direction cone */}
        {/*
          - When following user (map rotates with heading): cone points UP (rotation=0)
          - When in overview mode (map is north-up): cone shows actual heading
          - NO flat prop so marker stays upright on screen regardless of map pan/rotation
        */}
        <Marker
          coordinate={coordinates}
          anchor={{ x: 0.5, y: 0.5 }}
          rotation={isFollowingUser && !isOverviewMode ? 0 : (isNaN(heading) ? 0 : heading)}
        >
          <View style={styles.userLocationContainer}>
            {/* Direction cone/beam - points in direction user is facing */}
            <View style={styles.directionCone} />
            {/* Blue dot */}
            <View style={styles.userLocationDot}>
              <View style={styles.userLocationInner} />
            </View>
          </View>
        </Marker>

        {/* Waypoint markers */}
        {waypoints.map((wp, index) => (
          <Marker key={wp.id} coordinate={wp.coordinates}>
            <View style={styles.waypointMarker}>
              <Text style={styles.waypointMarkerText}>{index + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Destination marker */}
        <Marker coordinate={currentDestination.coordinates} title={currentDestination.title}>
          <View style={styles.destinationMarker}>
            <MapPin size={20} color="#FFFFFF" />
          </View>
        </Marker>
      </MapView>

      {/* Turn Instruction Header - Apple Maps style */}
      {currentStep && !hasArrived && !showChat && (
        <SafeAreaView style={styles.turnHeader} edges={['top']}>
          {/* Main turn header - tappable to expand step list */}
          <TouchableOpacity
            style={styles.turnHeaderContent}
            onPress={toggleStepList}
            activeOpacity={0.8}
          >
            <View style={[
              styles.maneuverIcon,
              currentStep.mode === 'train' && styles.transitIcon,
              currentStep.mode === 'bus' && styles.busIcon,
            ]}>
              {getStepIcon(currentStep)}
            </View>
            <View style={styles.turnInfo}>
              {/* For transit: show line name and duration */}
              {(currentStep.mode === 'train' || currentStep.mode === 'bus') ? (
                <>
                  <Text style={styles.transitLine} numberOfLines={1}>
                    {currentStep.line || 'Transit'}
                  </Text>
                  <Text style={styles.streetName} numberOfLines={1}>
                    {currentStep.details || currentStep.instruction.replace(/<[^>]*>/g, '')}
                  </Text>
                </>
              ) : (
                /* For walking: show distance and street name */
                <>
                  <View style={styles.distanceRow}>
                    <Text style={styles.turnDistance}>
                      {formatDistance(currentStep.distance || distanceToDestination)}
                    </Text>
                    <Text style={styles.turnDistanceUnit}>
                      {formatDistanceUnit(currentStep.distance || distanceToDestination)}
                    </Text>
                  </View>
                  <Text style={styles.streetName} numberOfLines={1}>
                    {extractStreetName(currentStep.instruction)}
                  </Text>
                </>
              )}
            </View>
            {/* Expand/collapse indicator */}
            <View style={styles.expandIndicator}>
              <List size={20} color={colors.text.secondary} />
              {showStepList ? (
                <ChevronUp size={16} color={colors.text.secondary} />
              ) : (
                <ChevronDown size={16} color={colors.text.secondary} />
              )}
            </View>
          </TouchableOpacity>

          {/* Expandable Step List */}
          {showStepList && route?.steps && (
            <Animated.View
              style={[
                styles.stepListContainer,
                {
                  opacity: stepListAnim,
                  maxHeight: stepListAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 300],
                  }),
                },
              ]}
            >
              <ScrollView
                style={styles.stepList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {route.steps.map((step, index) => {
                  const isCurrentStep = index === currentStepIndex;
                  const isPastStep = index < currentStepIndex;
                  const isTransit = step.mode === 'train' || step.mode === 'bus';

                  return (
                    <View
                      key={index}
                      style={[
                        styles.stepListItem,
                        isCurrentStep && styles.stepListItemCurrent,
                        isPastStep && styles.stepListItemPast,
                      ]}
                    >
                      {/* Step indicator */}
                      <View style={[
                        styles.stepIndicator,
                        isCurrentStep && styles.stepIndicatorCurrent,
                        isPastStep && styles.stepIndicatorPast,
                      ]}>
                        {isPastStep ? (
                          <Check size={12} color={colors.text.inverse} />
                        ) : isTransit ? (
                          step.mode === 'train' ? (
                            <Train size={12} color={isCurrentStep ? colors.text.inverse : colors.text.secondary} />
                          ) : (
                            <Car size={12} color={isCurrentStep ? colors.text.inverse : colors.text.secondary} />
                          )
                        ) : (
                          <Footprints size={12} color={isCurrentStep ? colors.text.inverse : colors.text.secondary} />
                        )}
                      </View>

                      {/* Step content */}
                      <View style={styles.stepContent}>
                        <Text
                          style={[
                            styles.stepInstruction,
                            isCurrentStep && styles.stepInstructionCurrent,
                            isPastStep && styles.stepInstructionPast,
                          ]}
                          numberOfLines={2}
                        >
                          {isTransit && step.line ? `${step.line}: ` : ''}
                          {step.instruction.replace(/<[^>]*>/g, '')}
                        </Text>
                        <View style={styles.stepMeta}>
                          {step.distance && (
                            <Text style={[styles.stepMetaText, isPastStep && styles.stepMetaTextPast]}>
                              {formatDistance(step.distance)} {formatDistanceUnit(step.distance)}
                            </Text>
                          )}
                          {step.duration && (
                            <Text style={[styles.stepMetaText, isPastStep && styles.stepMetaTextPast]}>
                              {Math.round(step.duration)} min
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Final destination */}
                <View style={styles.stepListItem}>
                  <View style={[styles.stepIndicator, styles.stepIndicatorDestination]}>
                    <MapPin size={12} color={colors.text.inverse} />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepInstructionCurrent} numberOfLines={1}>
                      Arrive at {currentDestination?.title}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          )}

          {/* Travel Mode Selector */}
          <View style={styles.travelModeSelector}>
            <TouchableOpacity
              style={[
                styles.travelModeButton,
                travelMode === 'WALK' && styles.travelModeButtonActive,
              ]}
              onPress={() => handleTravelModeChange('WALK')}
            >
              <Footprints size={18} color={travelMode === 'WALK' ? colors.text.inverse : colors.text.secondary} />
              <Text style={[
                styles.travelModeText,
                travelMode === 'WALK' && styles.travelModeTextActive,
              ]}>Walk</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.travelModeButton,
                travelMode === 'TRANSIT' && styles.travelModeButtonActive,
              ]}
              onPress={() => handleTravelModeChange('TRANSIT')}
            >
              <Train size={18} color={travelMode === 'TRANSIT' ? colors.text.inverse : colors.text.secondary} />
              <Text style={[
                styles.travelModeText,
                travelMode === 'TRANSIT' && styles.travelModeTextActive,
              ]}>Transit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.travelModeButton,
                travelMode === 'DRIVE' && styles.travelModeButtonActive,
              ]}
              onPress={() => handleTravelModeChange('DRIVE')}
            >
              <Car size={18} color={travelMode === 'DRIVE' ? colors.text.inverse : colors.text.secondary} />
              <Text style={[
                styles.travelModeText,
                travelMode === 'DRIVE' && styles.travelModeTextActive,
              ]}>Drive</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* Control buttons - right side */}
      <View style={[styles.controlButtons, { top: insets.top + 140 }]}>
        {/* Overview button */}
        <TouchableOpacity
          style={[styles.controlButton, isOverviewMode && styles.controlButtonActive]}
          onPress={handleOverview}
        >
          <Map size={20} color={isOverviewMode ? colors.text.inverse : colors.text.primary} />
        </TouchableOpacity>

        {/* Re-center button */}
        {(!isFollowingUser || isOverviewMode) && (
          <TouchableOpacity style={styles.controlButton} onPress={handleRecenter}>
            <Locate size={20} color={colors.accent.primary} />
          </TouchableOpacity>
        )}

        {/* Add Stop button - like Apple Maps */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            safeHaptics.impact(ImpactFeedbackStyle.Medium);
            setChatInput('Find a stop along my route');
            setShowChat(true);
          }}
        >
          <Plus size={20} color={colors.accent.primary} />
        </TouchableOpacity>

        {/* Mute button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            const newMuted = !isMuted;
            setIsMuted(newMuted);
            if (newMuted && Speech) {
              Speech.stop();
            }
          }}
        >
          {isMuted ? (
            <VolumeX size={20} color={colors.text.secondary} />
          ) : (
            <Volume2 size={20} color={colors.text.primary} />
          )}
        </TouchableOpacity>

        {/* Chat button */}
        <TouchableOpacity
          style={[styles.controlButton, showChat && styles.controlButtonActive]}
          onPress={() => setShowChat(!showChat)}
        >
          <MessageCircle size={20} color={showChat ? colors.text.inverse : colors.text.primary} />
        </TouchableOpacity>

        {/* Map type toggle (standard/satellite/hybrid) */}
        <TouchableOpacity
          style={[styles.controlButton, mapType !== 'standard' && styles.controlButtonActive]}
          onPress={() => {
            safeHaptics.impact(ImpactFeedbackStyle.Light);
            // Cycle through: standard → satellite → hybrid → standard
            setMapType(prev => {
              if (prev === 'standard') return 'satellite';
              if (prev === 'satellite') return 'hybrid';
              return 'standard';
            });
          }}
        >
          <Layers size={20} color={mapType !== 'standard' ? colors.text.inverse : colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Loading overlay */}
      {isLoadingRoute && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Getting directions...</Text>
        </View>
      )}

      {/* Arrived card */}
      {hasArrived && (
        <View style={[styles.arrivedCard, { bottom: insets.bottom + 20 }]}>
          <View style={styles.arrivedContent}>
            <Text style={styles.arrivedTitle}>You've arrived!</Text>
            <Text style={styles.arrivedSubtitle}>{currentDestination.title}</Text>
          </View>
          <TouchableOpacity style={styles.doneButton} onPress={handleArrived}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Smart Chat Panel */}
      {showChat && (
        <Animated.View
          style={[
            styles.chatPanel,
            {
              transform: [{
                translateY: chatSlideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [400, 0],
                }),
              }],
            },
          ]}
        >
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Ask Tomo</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <ChevronDown size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.chatMessages} showsVerticalScrollIndicator={false}>
            {chatMessages.length === 0 && (
              <>
                <Text style={styles.chatHint}>
                  Find places, add stops, or ask questions
                </Text>
                <View style={styles.quickActionsContainer}>
                  {QUICK_ACTIONS.map((action) => (
                    <TouchableOpacity
                      key={action.label}
                      style={styles.quickActionChip}
                      onPress={() => handleChatSend(action.message)}
                    >
                      {action.icon}
                      <Text style={styles.quickActionText}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {chatMessages.map((msg, index) => (
              <View key={index}>
                <View
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

                {/* Action buttons for assistant messages */}
                {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                  <View style={styles.actionButtonsContainer}>
                    {msg.actions.map((action, actionIndex) => (
                      <TouchableOpacity
                        key={actionIndex}
                        style={[
                          styles.actionButton,
                          action.type === 'add_stop' && styles.actionButtonPrimary,
                        ]}
                        onPress={() => handleActionPress(action, msg.places)}
                      >
                        {action.type === 'add_stop' && <Plus size={14} color={colors.text.inverse} />}
                        <Text
                          style={[
                            styles.actionButtonText,
                            action.type === 'add_stop' && styles.actionButtonTextPrimary,
                          ]}
                        >
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {isChatLoading && <TypingIndicator size="small" />}
          </ScrollView>

          <View style={[styles.chatInputContainer, { paddingBottom: insets.bottom || spacing.md }]}>
            <TextInput
              style={styles.chatInput}
              placeholder="Ask something..."
              placeholderTextColor={colors.text.tertiary}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={() => handleChatSend()}
              returnKeyType="send"
              keyboardAppearance="dark"
              blurOnSubmit={true}
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.chatSendButton, !chatInput.trim() && styles.chatSendButtonDisabled]}
              onPress={() => handleChatSend()}
              disabled={!chatInput.trim()}
            >
              <Send size={18} color={chatInput.trim() ? colors.text.inverse : colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Bottom Stats Bar - Apple Maps style */}
      {route && !hasArrived && !showChat && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom || spacing.lg }]}>
          {/* End Route button */}
          <TouchableOpacity style={styles.endRouteButton} onPress={handleEndRoute}>
            <X size={20} color="#FFFFFF" />
            <Text style={styles.endRouteText}>End</Text>
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatArrivalTime(etaMinutes)}</Text>
              <Text style={styles.statLabel}>Arrival</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDuration(etaMinutes)}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDistance(distanceToDestination)} {formatDistanceUnit(distanceToDestination)}
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Turn instruction header - Apple Maps style
  turnHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    ...shadows.lg,
  },
  turnHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  maneuverIcon: {
    width: 56,
    height: 56,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitIcon: {
    backgroundColor: '#4285F4', // Google Maps blue for trains
  },
  busIcon: {
    backgroundColor: '#34A853', // Google Maps green for buses
  },
  turnInfo: {
    flex: 1,
  },
  expandIndicator: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },

  // Step list styles
  stepListContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    overflow: 'hidden',
  },
  stepList: {
    maxHeight: 280,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  stepListItemCurrent: {
    backgroundColor: colors.accent.muted,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borders.radius.md,
  },
  stepListItemPast: {
    opacity: 0.6,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepIndicatorCurrent: {
    backgroundColor: colors.accent.primary,
  },
  stepIndicatorPast: {
    backgroundColor: colors.status.success,
  },
  stepIndicatorDestination: {
    backgroundColor: '#EA4335', // Red for destination
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  stepInstructionCurrent: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  stepInstructionPast: {
    color: colors.text.tertiary,
  },
  stepMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 2,
  },
  stepMetaText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  stepMetaTextPast: {
    opacity: 0.7,
  },

  distanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  turnDistance: {
    fontSize: 42,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    lineHeight: 46,
  },
  turnDistanceUnit: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  transitLine: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  streetName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Travel mode selector
  travelModeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  travelModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderRadius: borders.radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  travelModeButtonActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  travelModeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  travelModeTextActive: {
    color: colors.text.inverse,
  },

  // Custom user location marker with direction cone
  userLocationContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionCone: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(66, 133, 244, 0.3)', // Google blue with transparency
  },
  userLocationDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  userLocationInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4285F4', // Google blue
  },

  // Control buttons
  controlButtons: {
    position: 'absolute',
    right: spacing.md,
    gap: spacing.sm,
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  controlButtonActive: {
    backgroundColor: colors.accent.primary,
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface.modalOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },

  // Markers
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.lg,
  },
  waypointMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...shadows.md,
  },
  waypointMarkerText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },

  // Arrived card
  arrivedCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.status.success,
    borderRadius: borders.radius.xl,
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
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  arrivedSubtitle: {
    fontSize: typography.sizes.base,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  doneButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.md,
  },
  doneButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.status.success,
  },

  // Bottom stats bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borders.radius.xl,
    borderTopRightRadius: borders.radius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    ...shadows.lg,
  },
  endRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.status.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.full,
  },
  endRouteText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.default,
  },

  // Chat panel
  chatPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borders.radius.xl,
    borderTopRightRadius: borders.radius.xl,
    maxHeight: SCREEN_HEIGHT * 0.55,
    ...shadows.lg,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  chatTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  chatMessages: {
    flex: 1,
    padding: spacing.lg,
    maxHeight: 280,
  },
  chatHint: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    maxWidth: '85%',
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
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  chatBubbleTextUser: {
    color: colors.chat.userText,
  },
  chatBubbleTextAssistant: {
    color: colors.chat.assistantText,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingLeft: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  actionButtonPrimary: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  actionButtonTextPrimary: {
    color: colors.text.inverse,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  chatInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface.input,
    borderRadius: borders.radius.full,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  chatSendButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonDisabled: {
    backgroundColor: colors.background.tertiary,
  },
});
