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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, Camera, Mic, Navigation as NavigationIcon, CheckCircle, ExternalLink } from 'lucide-react-native';
import { colors, spacing } from '../constants/theme';
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
import { config } from '../constants/config';
import type { ChatMessage, DestinationContext, TransitRoute } from '../types';

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

export default function NavigationScreen() {
  const router = useRouter();
  const timeOfDay = useTimeOfDay();
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

  // Build static map URL
  const buildStaticMapUrl = () => {
    if (!coordinates || !currentDestination) return null;

    const apiKey = config.googlePlacesApiKey;
    let url = `https://maps.googleapis.com/maps/api/staticmap?`;
    url += `size=600x400&scale=2&maptype=roadmap`;

    // User location (blue)
    url += `&markers=color:blue%7C${coordinates.latitude},${coordinates.longitude}`;

    // Destination (red)
    url += `&markers=color:red%7C${currentDestination.coordinates.latitude},${currentDestination.coordinates.longitude}`;

    // Route path if available
    if (route?.polyline) {
      url += `&path=color:0x007AFF%7Cweight:4%7Cenc:${encodeURIComponent(route.polyline)}`;
    }

    url += `&key=${apiKey}`;
    return url;
  };

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

  // Check for arrival
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
    }
  }, [coordinates, currentDestination, hasArrived]);

  const handleImDone = () => {
    router.replace('/');
  };

  const handleOpenInGoogleMaps = () => {
    if (!currentDestination) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${currentDestination.coordinates.latitude},${currentDestination.coordinates.longitude}&travelmode=walking`;
    Linking.openURL(url);
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
        ? `\n\n[NAVIGATION CONTEXT: User is navigating to ${currentDestination.title} at ${currentDestination.address}. Be helpful about the route or destination.]`
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

  const staticMapUrl = buildStaticMapUrl();

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
              <Text style={[styles.headerSubtitle, { color: '#34C759' }]}>You've arrived!</Text>
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

        {/* Static Map Image */}
        <View style={styles.mapContainer}>
          {staticMapUrl ? (
            <TouchableOpacity onPress={handleOpenInGoogleMaps} activeOpacity={0.9}>
              <Image source={{ uri: staticMapUrl }} style={styles.mapImage} resizeMode="cover" />
              <View style={styles.openInMapsButton}>
                <ExternalLink size={16} color="#007AFF" />
                <Text style={styles.openInMapsText}>Open in Google Maps</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.mapPlaceholder}>
              <NavigationIcon size={48} color="#9CA3AF" />
              <Text style={styles.mapPlaceholderText}>Loading map...</Text>
            </View>
          )}
        </View>

        {/* Chat Section */}
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
    height: 220,
    backgroundColor: '#E5E7EB',
  },
  mapImage: {
    width: '100%',
    height: 220,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  openInMapsButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  openInMapsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
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
