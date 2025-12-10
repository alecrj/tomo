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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowLeft, Send, Camera, Mic, Navigation as NavigationIcon, CheckCircle } from 'lucide-react-native';
import { colors, spacing, typography } from '../constants/theme';
import { chatSimple } from '../services/claude';
import { takePhoto, pickPhoto } from '../services/camera';
import { startRecording, stopRecording, transcribeAudio } from '../services/voice';
import { getWalkingDirections } from '../services/routes';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useConversationStore } from '../stores/useConversationStore';
import { useMemoryStore } from '../stores/useMemoryStore';
import { useTripStore } from '../stores/useTripStore';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { detectCurrency } from '../utils/currency';
import type { ChatMessage, DestinationContext, TransitRoute } from '../types';

// Calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
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

export default function NavigationScreen() {
  const router = useRouter();
  const timeOfDay = useTimeOfDay();
  const mapRef = useRef<MapView>(null);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const currency = coordinates ? detectCurrency(coordinates) : { code: 'USD', symbol: '$', name: 'US Dollar' };

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

  // Fit map to show both start and destination
  useEffect(() => {
    if (mapRef.current && coordinates && currentDestination) {
      mapRef.current.fitToCoordinates(
        [coordinates, currentDestination.coordinates],
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  }, [coordinates, currentDestination]);

  // Fetch route when destination is set
  useEffect(() => {
    async function fetchRoute() {
      if (coordinates && currentDestination && !route) {
        console.log('[Navigation] Fetching route...');
        const fetchedRoute = await getWalkingDirections(coordinates, currentDestination.coordinates);
        if (fetchedRoute) {
          setRoute(fetchedRoute);
          startNavigation(currentDestination, fetchedRoute);
        }
      }
    }
    fetchRoute();
  }, [currentDestination, coordinates]);

  // Check for arrival (within 50 meters of destination)
  useEffect(() => {
    if (coordinates && currentDestination && !hasArrived) {
      const distance = calculateDistance(
        coordinates.latitude,
        coordinates.longitude,
        currentDestination.coordinates.latitude,
        currentDestination.coordinates.longitude
      );
      setDistanceToDestination(distance);

      if (distance < 50) {
        setHasArrived(true);
        markArrived();

        // Add arrival message
        const arrivalMessage: ChatMessage = {
          id: `system-arrival-${Date.now()}`,
          role: 'system',
          content: `You've arrived at ${currentDestination.title}! Ask me anything about this place.`,
          timestamp: Date.now(),
        };
        conversationStore.addMessage(arrivalMessage);

        // Log visit
        addVisit({
          placeId: currentDestination.placeId || currentDestination.id,
          name: currentDestination.title,
          neighborhood: currentDestination.neighborhood,
          city: neighborhood?.split(',')[0]?.trim() || 'Unknown',
          country: neighborhood?.split(',').pop()?.trim() || 'Unknown',
          coordinates: currentDestination.coordinates,
        });
      }
    }
  }, [coordinates, currentDestination, hasArrived]);

  // Handle arrival action
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
        ? `\n\n[NAVIGATION CONTEXT: User is navigating to ${currentDestination.title} at ${currentDestination.address}. They can see the map above and are asking questions about the route or destination. Be helpful and specific about navigation.]`
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
            if (image) {
              handleSendMessage('What can you tell me about this?', image);
            }
          } else if (buttonIndex === 2) {
            const image = await pickPhoto();
            if (image) {
              handleSendMessage('What can you tell me about this?', image);
            }
          }
        }
      );
    } else {
      Alert.alert(
        'Add Photo',
        'Choose a photo source',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Take Photo',
            onPress: async () => {
              const image = await takePhoto();
              if (image) {
                handleSendMessage('What can you tell me about this?', image);
              }
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const image = await pickPhoto();
              if (image) {
                handleSendMessage('What can you tell me about this?', image);
              }
            },
          },
        ]
      );
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
        }
      }
    } else {
      const started = await startRecording();
      if (started) {
        setIsRecording(true);
      }
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
            <Text style={styles.emptyText}>No destination set</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
                {route.totalDuration} min • {(route.totalDistance / 1000).toFixed(1)} km
                {distanceToDestination && ` • ${Math.round(distanceToDestination)}m away`}
              </Text>
            )}
            {hasArrived && (
              <Text style={[styles.headerSubtitle, { color: '#34C759' }]}>
                You've arrived!
              </Text>
            )}
          </View>
          {hasArrived ? (
            <CheckCircle size={20} color="#34C759" />
          ) : (
            <NavigationIcon size={20} color="#007AFF" />
          )}
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

        {/* Map - Top 60% */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {/* Destination marker */}
            <Marker
              coordinate={currentDestination.coordinates}
              title={currentDestination.title}
              description={currentDestination.address}
            />

            {/* Route polyline */}
            {route && route.polyline && (
              <Polyline
                coordinates={decodePolyline(route.polyline)}
                strokeColor={hasArrived ? '#34C759' : '#007AFF'}
                strokeWidth={4}
              />
            )}
          </MapView>
        </View>

        {/* Chat Section - Bottom 40% */}
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Messages */}
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

          {/* Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
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
              </View>

              {inputText.trim() ? (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => handleSendMessage()}
                  disabled={isSending}
                >
                  <Send size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.iconButton, isRecording && styles.recordingButton]}
                  onPress={handleVoicePress}
                >
                  <Mic
                    size={22}
                    color={isRecording ? '#FF3B30' : colors.text.light.secondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// Helper to decode Google Maps polyline
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
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
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.light.secondary,
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
    height: '60%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
    borderRadius: 16,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textInputContainer: {
    flex: 1,
    minHeight: 32,
    maxHeight: 80,
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    color: colors.text.light.primary,
    minHeight: 18,
  },
  sendButton: {
    width: 32,
    height: 32,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
});
