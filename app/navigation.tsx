import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  ArrowLeft,
  Send,
  Camera,
  Mic,
  Navigation as NavigationIcon,
  CheckCircle,
  Car,
  Train,
  Footprints,
  ChevronRight,
  MapPin,
} from 'lucide-react-native';
import { colors, spacing } from '../constants/theme';
import { chatSimple } from '../services/claude';
import { takePhoto, pickPhoto } from '../services/camera';
import { startRecording, stopRecording, transcribeAudio } from '../services/voice';
import { getDirections, TravelMode } from '../services/routes';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useConversationStore } from '../stores/useConversationStore';
import { useMemoryStore } from '../stores/useMemoryStore';
import { useTripStore } from '../stores/useTripStore';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { detectCurrency } from '../utils/currency';
import { decodePolyline } from '../utils/polyline';
import type { ChatMessage, DestinationContext, TransitRoute, Coordinates } from '../types';

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.45;

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
  const timeOfDay = useTimeOfDay();
  const scrollViewRef = useRef<ScrollView>(null);
  const mapRef = useRef<MapView>(null);

  // Store state
  const currentDestination = useNavigationStore((state) => state.currentDestination);
  const currentRoute = useNavigationStore((state) => state.currentRoute);
  const startNavigation = useNavigationStore((state) => state.startNavigation);
  const markArrived = useNavigationStore((state) => state.markArrived);
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const conversationStore = useConversationStore();
  const getMemoryContext = useMemoryStore((state) => state.getMemoryContext);
  const currentConversation = conversationStore.getCurrentConversation();
  const addVisit = useTripStore((state) => state.addVisit);

  // Local state
  const [messages, setMessages] = useState<ChatMessage[]>(currentConversation?.messages || []);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [route, setRoute] = useState<TransitRoute | null>(currentRoute);
  const [hasArrived, setHasArrived] = useState(false);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<TravelMode>('WALK');
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showSteps, setShowSteps] = useState(false);

  const currency = coordinates ? detectCurrency(coordinates) : { code: 'USD', symbol: '$', name: 'US Dollar' };

  // Decode polyline for map
  const routeCoordinates = route?.polyline ? decodePolyline(route.polyline) : [];

  // Sync messages with conversation
  useEffect(() => {
    if (currentConversation) {
      setMessages(currentConversation.messages);
    }
  }, [currentConversation?.id]);

  // Auto-scroll to bottom when new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Fetch route when destination is set or mode changes
  useEffect(() => {
    async function fetchRoute() {
      if (coordinates && currentDestination) {
        setIsLoadingRoute(true);
        console.log('[Navigation] Fetching route with mode:', selectedMode);
        const fetchedRoute = await getDirections(coordinates, currentDestination.coordinates, selectedMode);
        if (fetchedRoute) {
          setRoute(fetchedRoute);
          startNavigation(currentDestination, fetchedRoute);
          setCurrentStepIndex(0);
        }
        setIsLoadingRoute(false);
      }
    }
    fetchRoute();
  }, [currentDestination, coordinates, selectedMode]);

  // Fit map to show route
  useEffect(() => {
    if (mapRef.current && routeCoordinates.length > 0 && coordinates) {
      const allCoords = [
        coordinates,
        ...routeCoordinates,
        currentDestination?.coordinates,
      ].filter(Boolean) as Coordinates[];

      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [routeCoordinates, coordinates]);

  // Check for arrival and update current step
  useEffect(() => {
    if (coordinates && currentDestination && !hasArrived) {
      const distance = calculateDistance(
        coordinates.latitude,
        coordinates.longitude,
        currentDestination.coordinates.latitude,
        currentDestination.coordinates.longitude
      );
      setDistanceToDestination(distance);

      // Check arrival (within 50 meters)
      if (distance < 50) {
        setHasArrived(true);
        markArrived();

        const arrivalMessage: ChatMessage = {
          id: `system-arrival-${Date.now()}`,
          role: 'system',
          content: `You've arrived at ${currentDestination.title}! Ask me anything about this place.`,
          timestamp: Date.now(),
        };
        conversationStore.addMessage(arrivalMessage);

        addVisit({
          placeId: currentDestination.placeId || currentDestination.id,
          name: currentDestination.title,
          neighborhood: currentDestination.neighborhood,
          city: neighborhood?.split(',')[0]?.trim() || 'Unknown',
          country: neighborhood?.split(',').pop()?.trim() || 'Unknown',
          coordinates: currentDestination.coordinates,
        });
      }

      // Update current step based on progress
      if (route?.steps && route.steps.length > 0) {
        // Simple heuristic: advance step based on distance completed
        const totalDistance = route.totalDistance;
        const remainingDistance = distance;
        const completedDistance = totalDistance - remainingDistance;
        const progressRatio = completedDistance / totalDistance;
        const estimatedStep = Math.min(
          Math.floor(progressRatio * route.steps.length),
          route.steps.length - 1
        );
        setCurrentStepIndex(Math.max(estimatedStep, 0));
      }
    }
  }, [coordinates, currentDestination, hasArrived, route]);

  const handleImDone = () => {
    router.replace('/');
  };

  const handleSendMessage = async (messageText?: string, imageBase64?: string) => {
    const text = messageText || inputText.trim();
    if ((!text && !imageBase64) || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || '[Image]',
      timestamp: Date.now(),
      image: imageBase64,
    };

    conversationStore.addMessage(userMessage);
    setInputText('');
    setIsSending(true);

    try {
      const memoryContext = getMemoryContext();
      const navigationContext = currentDestination
        ? `\n\n[NAVIGATION CONTEXT: User is navigating to ${currentDestination.title} at ${currentDestination.address}. Current step: "${route?.steps[currentStepIndex]?.instruction || 'Starting navigation'}". Distance remaining: ${distanceToDestination ? formatDistance(distanceToDestination) : 'calculating'}. Be helpful about the route or destination.]`
        : '';

      const systemContext = coordinates
        ? `\n\n[SYSTEM CONTEXT: User is at GPS ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)} in ${neighborhood || 'unknown'}. Local currency: ${currency.name} (${currency.symbol}). Current time: ${timeOfDay}.]${memoryContext}${navigationContext}`
        : '';

      const enhancedMessage = text + systemContext;

      const mockContext: DestinationContext = {
        location: coordinates || { latitude: 0, longitude: 0 },
        neighborhood: neighborhood || 'unknown',
        timeOfDay,
        weather: null,
        budgetRemaining: 0,
        dailyBudget: 0,
        preferences: {
          homeBase: null,
          walkingTolerance: 'moderate',
          budget: 'moderate',
          dietary: [],
          interests: [],
          avoidCrowds: false,
        },
        visitedPlaces: [],
        completedStamps: [],
        excludedToday: [],
        totalWalkingToday: 0,
      };

      const response = await chatSimple(enhancedMessage, mockContext, messages, imageBase64);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      conversationStore.addMessage(assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I'm having trouble responding. Please try again.",
        timestamp: Date.now(),
      };
      conversationStore.addMessage(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleCamera = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            const image = await takePhoto();
            if (image) handleSendMessage('What can you tell me about this?', image);
          } else if (buttonIndex === 2) {
            const image = await pickPhoto();
            if (image) handleSendMessage('What can you tell me about this?', image);
          }
        }
      );
    } else {
      Alert.alert('Add Photo', 'Choose a photo source', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: async () => {
            const image = await takePhoto();
            if (image) handleSendMessage('What can you tell me about this?', image);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const image = await pickPhoto();
            if (image) handleSendMessage('What can you tell me about this?', image);
          },
        },
      ]);
    }
  };

  const handleVoicePress = async () => {
    if (isRecording) {
      setIsRecording(false);
      const audioUri = await stopRecording();
      if (audioUri) {
        const transcription = await transcribeAudio(audioUri);
        if (transcription) {
          handleSendMessage(transcription);
        } else {
          Alert.alert('Voice Not Available', 'Voice transcription is not configured.');
        }
      }
    } else {
      const started = await startRecording();
      if (started) {
        setIsRecording(true);
      } else {
        Alert.alert('Microphone Permission', 'Please allow microphone access.');
      }
    }
  };

  const handleModeChange = (mode: TravelMode) => {
    if (mode !== selectedMode) {
      setSelectedMode(mode);
      setRoute(null); // Clear current route to trigger refetch
    }
  };

  if (!currentDestination || !coordinates) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text.light.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Navigation</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.emptyState}>
            <NavigationIcon size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No destination set</Text>
            <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
              <Text style={styles.goBackText}>Go back to chat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const currentStep = route?.steps[currentStepIndex];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.light.primary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentDestination.title}
            </Text>
            {route && !hasArrived && (
              <Text style={styles.headerSubtitle}>
                {formatDuration(route.totalDuration)} • {formatDistance(route.totalDistance)}
                {distanceToDestination && ` • ${formatDistance(distanceToDestination)} away`}
              </Text>
            )}
            {hasArrived && (
              <Text style={[styles.headerSubtitle, { color: '#34C759' }]}>You've arrived!</Text>
            )}
          </View>
          {hasArrived ? (
            <CheckCircle size={20} color="#34C759" />
          ) : (
            <NavigationIcon size={20} color="#007AFF" />
          )}
        </View>

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
              <Icon
                size={18}
                color={selectedMode === mode ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  selectedMode === mode && styles.modeButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Arrival Banner */}
        {hasArrived && (
          <View style={styles.arrivalBanner}>
            <View style={styles.arrivalContent}>
              <CheckCircle size={24} color="#34C759" />
              <View style={styles.arrivalText}>
                <Text style={styles.arrivalTitle}>You've arrived!</Text>
                <Text style={styles.arrivalSubtitle}>Tap below when you're done exploring</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.doneButton} onPress={handleImDone}>
              <Text style={styles.doneButtonText}>I'm done here</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Interactive Map */}
        <View style={styles.mapContainer}>
          {isLoadingRoute && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Getting directions...</Text>
            </View>
          )}
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsUserLocation
            showsMyLocationButton
            followsUserLocation={!hasArrived}
            initialRegion={{
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            {/* Destination Marker */}
            <Marker
              coordinate={currentDestination.coordinates}
              title={currentDestination.title}
              description={currentDestination.address}
            >
              <View style={styles.destinationMarker}>
                <MapPin size={24} color="#FFFFFF" fill="#FF3B30" />
              </View>
            </Marker>

            {/* Route Polyline */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#007AFF"
                strokeWidth={5}
                lineDashPattern={selectedMode === 'WALK' ? [10, 5] : undefined}
              />
            )}
          </MapView>
        </View>

        {/* Current Step Display */}
        {currentStep && !hasArrived && (
          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => setShowSteps(!showSteps)}
            activeOpacity={0.9}
          >
            <View style={styles.stepContent}>
              <View style={styles.stepIconContainer}>
                {currentStep.mode === 'walk' && <Footprints size={24} color="#007AFF" />}
                {currentStep.mode === 'train' && <Train size={24} color="#007AFF" />}
                {currentStep.mode === 'bus' && <Train size={24} color="#FF9500" />}
                {currentStep.mode === 'taxi' && <Car size={24} color="#34C759" />}
              </View>
              <View style={styles.stepDetails}>
                <Text style={styles.stepInstruction}>{currentStep.instruction}</Text>
                {currentStep.details && (
                  <Text style={styles.stepExtra}>{currentStep.details}</Text>
                )}
                {currentStep.line && (
                  <Text style={styles.stepLine}>
                    {currentStep.line} {currentStep.direction && `→ ${currentStep.direction}`}
                  </Text>
                )}
              </View>
              <View style={styles.stepMeta}>
                <Text style={styles.stepDuration}>{formatDuration(currentStep.duration)}</Text>
                {currentStep.distance && (
                  <Text style={styles.stepDistance}>{formatDistance(currentStep.distance)}</Text>
                )}
              </View>
            </View>
            <View style={styles.stepProgress}>
              <Text style={styles.stepProgressText}>
                Step {currentStepIndex + 1} of {route?.steps.length || 1}
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Expanded Steps List */}
        {showSteps && route?.steps && !hasArrived && (
          <ScrollView style={styles.stepsListContainer} showsVerticalScrollIndicator={false}>
            {route.steps.map((step, index) => (
              <View
                key={`step-${index}`}
                style={[
                  styles.stepListItem,
                  index === currentStepIndex && styles.stepListItemActive,
                  index < currentStepIndex && styles.stepListItemCompleted,
                ]}
              >
                <View style={styles.stepListNumber}>
                  <Text style={styles.stepListNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepListContent}>
                  <Text style={styles.stepListInstruction}>{step.instruction}</Text>
                  <Text style={styles.stepListMeta}>
                    {formatDuration(step.duration)} • {step.distance ? formatDistance(step.distance) : ''}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Chat Section */}
        {!showSteps && (
          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.slice(-10).map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  {message.image && (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${message.image}` }}
                      style={styles.messageImage}
                    />
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      message.role === 'user' ? styles.userText : styles.assistantText,
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              ))}
              {isSending && (
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <Text style={[styles.messageText, styles.assistantText]}>Thinking...</Text>
                </View>
              )}
            </ScrollView>

            {/* Input - iMessage style */}
            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.iconButton} onPress={handleCamera}>
                <Camera size={22} color={colors.text.light.secondary} />
              </TouchableOpacity>

              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ask about the route..."
                  placeholderTextColor={colors.text.light.tertiary}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={() => handleSendMessage()}
                  returnKeyType="send"
                  multiline
                  maxLength={500}
                />
                {inputText.trim() ? (
                  <TouchableOpacity
                    style={styles.sendButtonInline}
                    onPress={() => handleSendMessage()}
                    disabled={isSending}
                  >
                    <Send size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.micButtonInline, isRecording && styles.recordingButton]}
                    onPress={handleVoicePress}
                  >
                    <Mic size={18} color={isRecording ? '#FF3B30' : '#8E8E93'} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.light.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.text.light.secondary,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.light.secondary,
  },
  goBackButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  goBackText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
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
  arrivalBanner: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  arrivalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  arrivalText: {
    flex: 1,
  },
  arrivalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  arrivalSubtitle: {
    fontSize: 13,
    color: '#4CAF50',
  },
  doneButton: {
    backgroundColor: '#34C759',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  mapContainer: {
    height: MAP_HEIGHT,
    backgroundColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: '#6B7280',
  },
  destinationMarker: {
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDetails: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepExtra: {
    fontSize: 14,
    color: '#6B7280',
  },
  stepLine: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 4,
  },
  stepMeta: {
    alignItems: 'flex-end',
  },
  stepDuration: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  stepDistance: {
    fontSize: 13,
    color: '#6B7280',
  },
  stepProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stepProgressText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  stepsListContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    maxHeight: 200,
  },
  stepListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepListItemActive: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  stepListItemCompleted: {
    opacity: 0.5,
  },
  stepListNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepListNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepListContent: {
    flex: 1,
  },
  stepListInstruction: {
    fontSize: 14,
    color: '#1F2937',
  },
  stepListMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9E9EB',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#000000',
  },
  messageImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    gap: spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    paddingLeft: spacing.md,
    paddingRight: 4,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.light.primary,
    paddingVertical: 6,
    maxHeight: 80,
  },
  sendButtonInline: {
    width: 28,
    height: 28,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micButtonInline: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 14,
  },
});
