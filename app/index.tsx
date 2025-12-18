import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActionSheetIOS,
  Alert,
  StatusBar,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import {
  Send,
  Mic,
  Camera,
  Settings,
  MapPin,
  Plus,
  Home,
  MessageSquare,
  Map,
  ChevronDown,
  ChevronUp,
  Menu,
} from 'lucide-react-native';
import { colors, spacing, typography, borders, shadows } from '../constants/theme';
import { chat } from '../services/openai';
import { takePhoto, pickPhoto } from '../services/camera';
import { startRecording, stopRecording, transcribeAudio } from '../services/voice';
import { useLocationStore } from '../stores/useLocationStore';
import { useWeatherStore } from '../stores/useWeatherStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useTripStore } from '../stores/useTripStore';
import { useMemoryStore } from '../stores/useMemoryStore';
import { useConversationStore } from '../stores/useConversationStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useItineraryStore } from '../stores/useItineraryStore';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import { useCityDetection } from '../hooks/useCityDetection';
import { detectCurrency } from '../utils/currency';
import { TypingIndicator } from '../components/TypingIndicator';
import { PlaceCard } from '../components/PlaceCard';
import { InlineMap } from '../components/InlineMap';
import { ActionButtons } from '../components/ActionButtons';
import LogVisitModal from '../components/LogVisitModal';
import { QuickActionsMenu } from '../components/QuickActionsMenu';
import { Sidebar } from '../components/Sidebar';
import { NotificationContainer } from '../components/NotificationToast';
import { OfflineBanner } from '../components/OfflineBanner';
import type { DestinationContext, ChatMessage, MessageAction, Destination, WeatherCondition } from '../types';

export default function ChatScreen() {
  const router = useRouter();
  const timeOfDay = useTimeOfDay();
  const scrollViewRef = useRef<ScrollView>(null);

  // Hooks
  const { location } = useLocation();
  const { weather } = useWeather();
  const cityChange = useCityDetection();

  // Store state
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);
  const budgetStore = useBudgetStore();
  const dailyBudget = budgetStore.dailyBudget;
  const budgetRemaining = budgetStore.remainingToday();
  const spentToday = budgetStore.spentToday();
  const homeBase = usePreferencesStore((state) => state.homeBase);
  const walkingTolerance = usePreferencesStore((state) => state.walkingTolerance);
  const budgetLevel = usePreferencesStore((state) => state.budgetLevel);
  const dietary = usePreferencesStore((state) => state.dietary);
  const interests = usePreferencesStore((state) => state.interests);
  const avoidCrowds = usePreferencesStore((state) => state.avoidCrowds);
  const temperatureUnit = usePreferencesStore((state) => state.temperatureUnit);
  const visits = useTripStore((state) => state.visits);
  const totalWalkingMinutes = useTripStore((state) => state.totalWalkingMinutes);
  const currentTrip = useTripStore((state) => state.currentTrip);

  const getMemoryContext = useMemoryStore((state) => state.getMemoryContext);
  const addMessage = useConversationStore((state) => state.addMessage);
  const startNewConversation = useConversationStore((state) => state.startNewConversation);
  const currentConversationId = useConversationStore((state) => state.currentConversationId);
  const conversations = useConversationStore((state) => state.conversations);

  const currentConversation = useMemo(() => {
    return conversations.find((c) => c.id === currentConversationId) || null;
  }, [conversations, currentConversationId]);

  const messages = useMemo(() => {
    return currentConversation?.messages || [];
  }, [currentConversation]);

  const viewDestination = useNavigationStore((state) => state.viewDestination);
  const currentDestination = useNavigationStore((state) => state.currentDestination);
  const isNavigating = !!currentDestination;

  // Local state
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showContextBar, setShowContextBar] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showLogVisit, setShowLogVisit] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [lastPlaceCard, setLastPlaceCard] = useState<ChatMessage['placeCard'] | null>(null);

  const currency = coordinates
    ? detectCurrency(coordinates)
    : { code: 'USD', symbol: '$', name: 'US Dollar' };

  // Convert temperature based on user preference
  const displayTemperature = weatherTemperature
    ? temperatureUnit === 'F'
      ? Math.round((weatherTemperature * 9) / 5 + 32)
      : weatherTemperature
    : null;

  // Initialize budget
  useEffect(() => {
    if (dailyBudget === 0) {
      budgetStore.setTripBudget(10000, 5);
    }
  }, [dailyBudget]);

  // Initialize conversation
  useEffect(() => {
    if (!currentConversationId && coordinates) {
      startNewConversation(neighborhood || undefined, currentTrip?.id);
    }
  }, [currentConversationId, coordinates]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0 && coordinates && currentConversation) {
      const cityCountry = neighborhood || 'your current location';
      const greeting: ChatMessage = {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: `Hey! I'm Tomo, your AI travel companion.\n\nI can see you're in ${cityCountry}. I know your location, time, weather, and budget.\n\nAsk me anything or tell me what you're looking for!`,
        timestamp: Date.now(),
      };
      addMessage(greeting);
    }
  }, [coordinates, neighborhood, messages.length, currentConversation]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // City change detection
  useEffect(() => {
    if (cityChange && currentConversation) {
      const cityChangeMessage: ChatMessage = {
        id: `city-change-${Date.now()}`,
        role: 'assistant',
        content: `Welcome to ${cityChange.newCity}, ${cityChange.newCountry}!\n\nWhat would you like to explore first?`,
        timestamp: Date.now(),
        actions: [
          { label: 'Find food nearby', type: 'regenerate' as const },
          { label: 'Show me around', type: 'regenerate' as const },
        ],
      };
      addMessage(cityChangeMessage);
    }
  }, [cityChange]);

  const handleSendMessage = async (messageText?: string, imageBase64?: string) => {
    const text = messageText || inputText.trim();
    if ((!text && !imageBase64) || isSending) return;

    // Haptic feedback + dismiss keyboard (like ChatGPT)
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || '[Image]',
      timestamp: Date.now(),
      image: imageBase64,
    };

    addMessage(userMessage);
    setInputText('');
    setIsSending(true);

    try {
      const context: DestinationContext = {
        location: coordinates || { latitude: 0, longitude: 0 },
        neighborhood: neighborhood || 'unknown location',
        timeOfDay,
        weather:
          weatherCondition && weatherTemperature
            ? {
                condition: weatherCondition,
                temperature: weatherTemperature,
                description: `${weatherCondition}, ${weatherTemperature}°C`,
                humidity: 0,
              }
            : null,
        budgetRemaining,
        dailyBudget,
        preferences: {
          homeBase,
          walkingTolerance: walkingTolerance === 'medium' ? 'moderate' : walkingTolerance,
          budget: budgetLevel,
          dietary,
          interests,
          avoidCrowds,
        },
        visitedPlaces: visits.slice(-10),
        completedStamps: [],
        excludedToday: [],
        totalWalkingToday: totalWalkingMinutes,
      };

      const memoryContext = getMemoryContext();
      const systemContext = coordinates
        ? `\n\n[SYSTEM CONTEXT: User is at GPS ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)} in ${neighborhood || 'unknown'}. Local currency: ${currency.name} (${currency.symbol}). Current time: ${timeOfDay}. Weather: ${weatherCondition || 'unknown'}. Budget remaining today: ${currency.symbol}${budgetRemaining}. Use local currency for ALL prices. Be conversational, helpful, and specific. Include exact places with addresses when relevant.]${memoryContext}`
        : '';

      const enhancedMessage = text + systemContext;
      const response = await chat(enhancedMessage, context, messages, imageBase64);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        placeCard: response.placeCard,
        inlineMap: response.inlineMap,
        actions: response.actions,
      };

      if (response.placeCard) {
        setLastPlaceCard(response.placeCard);
      }

      // Haptic on response
      safeHaptics.notification(NotificationFeedbackType.Success);
      addMessage(assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I'm having trouble responding. Please try again.",
        timestamp: Date.now(),
      };
      addMessage(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleAction = (action: MessageAction, placeCard?: ChatMessage['placeCard']) => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);

    switch (action.type) {
      case 'navigate':
        if (placeCard) {
          const destination: Destination = {
            id: `dest-${Date.now()}`,
            title: placeCard.name,
            description: placeCard.address,
            whatItIs: placeCard.address,
            whenToGo: '',
            neighborhood: neighborhood || '',
            category: 'food',
            whyNow: '',
            address: placeCard.address,
            coordinates: placeCard.coordinates,
            priceLevel: placeCard.priceLevel || 2,
            transitPreview: {
              method: 'walk',
              totalMinutes: parseInt(placeCard.distance?.replace(/\D/g, '') || '10'),
              description: placeCard.distance || '10 min walk',
            },
            spots: [],
          };
          viewDestination(destination);
          router.push('/navigation');
        }
        break;
      case 'regenerate':
        handleSendMessage('Show me something else');
        break;
      case 'show_recap':
        router.push('/trip-recap');
        break;
      case 'log_expense':
        setShowLogVisit(true);
        break;
      case 'add_to_itinerary':
        if (placeCard) {
          // Get or create an active itinerary
          const itineraryStore = useItineraryStore.getState();
          let activeItinerary = itineraryStore.getActiveItinerary();

          if (!activeItinerary) {
            // Create a new itinerary for today
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            activeItinerary = itineraryStore.createItinerary(
              `${neighborhood || 'My'} Itinerary`,
              today.getTime(),
              tomorrow.getTime(),
              currentTrip?.id
            );
          }

          // Add the place as an activity
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          itineraryStore.addActivity(activeItinerary.id, todayStart.getTime(), {
            timeSlot: timeOfDay === 'morning' ? 'morning' : timeOfDay === 'afternoon' ? 'afternoon' : 'evening',
            title: placeCard.name,
            description: placeCard.description || placeCard.address,
            category: 'activity',
            place: placeCard,
            booked: false,
          });

          safeHaptics.notification(NotificationFeedbackType.Success);
          Alert.alert('Added to Itinerary', `${placeCard.name} has been added to your itinerary!`, [
            { text: 'View Itinerary', onPress: () => router.push('/itinerary') },
            { text: 'OK', style: 'cancel' },
          ]);
        }
        break;
      case 'save_for_later':
        if (placeCard) {
          // Add to memory as a liked place
          const memoryStore = useMemoryStore.getState();
          memoryStore.addMemory({
            type: 'like',
            category: 'place',
            content: `Saved for later: ${placeCard.name} at ${placeCard.address}`,
          });
          safeHaptics.notification(NotificationFeedbackType.Success);
          Alert.alert('Saved!', `${placeCard.name} has been saved for later.`);
        }
        break;
    }
  };

  const handleCamera = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);

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
      Alert.alert('Add Photo', 'Choose an option', [
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
    safeHaptics.impact(ImpactFeedbackStyle.Medium);

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

  const handleTakeMeHome = () => {
    if (!homeBase) {
      Alert.alert('Home Base Not Set', 'Please set your home base in Settings first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Settings', onPress: () => router.push('/settings') },
      ]);
      return;
    }
    handleSendMessage(`Take me home to ${homeBase.name}`);
  };

  const budgetPercentUsed = dailyBudget > 0 ? (spentToday / dailyBudget) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <OfflineBanner />
      <NotificationContainer />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Simplified Header - ChatGPT Style */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* Left: Hamburger Menu */}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setShowSidebar(true)}
            >
              <Menu size={24} color={colors.text.primary} />
            </TouchableOpacity>

            {/* Center: Location */}
            <View style={styles.headerCenter}>
              <Text style={styles.locationText} numberOfLines={1}>
                {neighborhood || 'Loading...'}
              </Text>
            </View>

            {/* Right: Map Button */}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/map')}
            >
              <Map size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Budget Bar - Subtle indicator */}
          {dailyBudget > 0 && (
            <View style={styles.budgetBar}>
              <View style={styles.budgetTrack}>
                <View
                  style={[
                    styles.budgetFill,
                    {
                      width: `${Math.min(budgetPercentUsed, 100)}%`,
                      backgroundColor:
                        budgetPercentUsed > 100
                          ? colors.budget.over
                          : budgetPercentUsed > 80
                            ? colors.budget.warning
                            : colors.budget.onTrack,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View key={message.id}>
                {/* User messages */}
                {message.role === 'user' && (
                  <View style={[styles.messageBubble, styles.userBubble]}>
                    {message.image && (
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${message.image}` }}
                        style={styles.messageImage}
                        resizeMode="cover"
                      />
                    )}
                    <Text style={[styles.messageText, styles.userText]}>
                      {message.content}
                    </Text>
                    <Text style={[styles.messageTime, styles.userTime]}>
                      {new Date(message.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}

                {/* Assistant messages - Full width, no bubble (ChatGPT style) */}
                {message.role === 'assistant' && (
                  <View style={styles.assistantMessageContainer}>
                    <Text style={styles.assistantText}>
                      {message.content}
                    </Text>
                    <Text style={styles.assistantTime}>
                      {new Date(message.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>

                    {message.placeCard && (
                      <PlaceCard
                        placeCard={message.placeCard}
                        currencySymbol={currency.symbol}
                        onTakeMeThere={() =>
                          handleAction({ label: 'Take me there', type: 'navigate' }, message.placeCard)
                        }
                        onSomethingElse={() =>
                          handleAction({ label: 'Something else', type: 'regenerate' })
                        }
                      />
                    )}

                    {message.inlineMap && (
                      <InlineMap
                        mapData={message.inlineMap}
                        onPress={() =>
                          handleAction({ label: 'Navigate', type: 'navigate' }, message.placeCard)
                        }
                      />
                    )}

                    {message.actions && !message.placeCard && (
                      <ActionButtons
                        actions={message.actions}
                        onAction={(action) => handleAction(action, message.placeCard)}
                      />
                    )}
                  </View>
                )}

                {/* System messages */}
                {message.role === 'system' && (
                  <View style={styles.systemMessage}>
                    <Text style={styles.systemText}>{message.content}</Text>
                  </View>
                )}
              </View>
            ))}

            {/* Typing indicator */}
            {isSending && <TypingIndicator />}
          </ScrollView>

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.inputIconButton} onPress={() => setShowQuickActions(true)}>
              <Plus size={22} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.inputIconButton} onPress={handleCamera}>
              <Camera size={22} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Message Tomo..."
                placeholderTextColor={colors.text.tertiary}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
                returnKeyType="send"
                multiline
                maxLength={1000}
                keyboardAppearance="dark"
              />

              {inputText.trim() ? (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => handleSendMessage()}
                  disabled={isSending}
                >
                  <Send size={16} color={colors.text.inverse} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.micButton, isRecording && styles.micButtonRecording]}
                  onPress={handleVoicePress}
                >
                  <Mic size={18} color={isRecording ? colors.status.error : colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <LogVisitModal visible={showLogVisit} onClose={() => setShowLogVisit(false)} />

      <QuickActionsMenu
        visible={showQuickActions}
        timeOfDay={timeOfDay}
        weather={weatherCondition as WeatherCondition | undefined}
        isNavigating={isNavigating}
        onSelectAction={(message) => handleSendMessage(message)}
        onClose={() => setShowQuickActions(false)}
      />

      <Sidebar
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
        onNewChat={() => {
          startNewConversation(neighborhood || undefined, currentTrip?.id);
        }}
        onSelectConversation={(conversationId) => {
          useConversationStore.getState().switchConversation(conversationId);
        }}
        onNavigate={(route) => router.push(route as any)}
      />
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
  // === COMPACT HEADER ===
  header: {
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
    paddingBottom: spacing.xs,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borders.radius.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  budgetBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  budgetTrack: {
    height: 3,
    backgroundColor: colors.budget.track,
    borderRadius: 2,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 2,
  },
  // === MESSAGES ===
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // === USER BUBBLE (keep bubbles for user) ===
  messageBubble: {
    maxWidth: '85%',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.xl,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.chat.userBubble,
    borderBottomRightRadius: borders.radius.xs,
  },
  messageText: {
    fontSize: typography.sizes.lg, // 17px - bigger font
    lineHeight: 26,
  },
  userText: {
    color: colors.chat.userText,
    fontSize: typography.sizes.lg,
    lineHeight: 26,
  },
  // === ASSISTANT - FULL WIDTH, NO BUBBLE (ChatGPT style) ===
  assistantMessageContainer: {
    width: '100%',
    marginBottom: spacing.lg,
    paddingRight: spacing.xl, // Some right padding for breathing room
  },
  assistantText: {
    color: colors.text.primary,
    fontSize: typography.sizes.lg, // 17px - bigger font
    lineHeight: 26,
  },
  assistantTime: {
    color: colors.text.tertiary,
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
  },
  // === SYSTEM MESSAGES ===
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.md,
    marginVertical: spacing.sm,
  },
  systemText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  messageTime: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  userTime: {
    color: 'rgba(13, 17, 23, 0.6)',
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
    gap: spacing.xs,
  },
  inputIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.surface.input,
    borderRadius: borders.radius.xl,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micButtonRecording: {
    backgroundColor: colors.status.errorMuted,
    borderRadius: borders.radius.full,
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: borders.radius.md,
    marginBottom: spacing.sm,
  },
});
