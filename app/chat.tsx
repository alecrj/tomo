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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import {
  Send,
  Mic,
  Camera,
  ChevronLeft,
  Plus,
} from 'lucide-react-native';
import { colors, spacing, typography, borders } from '../constants/theme';
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
import { useSavedPlacesStore } from '../stores/useSavedPlacesStore';
import { useOfflineStore } from '../stores/useOfflineStore';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import { detectCurrency } from '../utils/currency';
import { TypingIndicator } from '../components/TypingIndicator';
import { PlaceCard } from '../components/PlaceCard';
import { InlineMap } from '../components/InlineMap';
import { ActionButtons } from '../components/ActionButtons';
import { QuickActionsMenu } from '../components/QuickActionsMenu';
import type { DestinationContext, ChatMessage, MessageAction, Destination, WeatherCondition } from '../types';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialMessage?: string; openCamera?: string }>();
  const timeOfDay = useTimeOfDay();
  const scrollViewRef = useRef<ScrollView>(null);

  // Hooks
  const { location } = useLocation();
  const { weather } = useWeather();

  // Store state
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);
  const budgetStore = useBudgetStore();
  const dailyBudget = budgetStore.dailyBudget;
  const budgetRemaining = budgetStore.remainingToday();
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

  // Offline state
  const isOnline = useOfflineStore((state) => state.isOnline);
  const queueMessage = useOfflineStore((state) => state.queueMessage);

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

  // Saved places store
  const savePlace = useSavedPlacesStore((state) => state.savePlace);
  const isPlaceSaved = useSavedPlacesStore((state) => state.isPlaceSaved);

  // Local state
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const currency = coordinates
    ? detectCurrency(coordinates)
    : { code: 'USD', symbol: '$', name: 'US Dollar' };

  // Initialize conversation
  useEffect(() => {
    if (!currentConversationId && coordinates) {
      startNewConversation(neighborhood || undefined, currentTrip?.id);
    }
  }, [currentConversationId, coordinates]);

  // Handle initial message from params
  useEffect(() => {
    if (params.initialMessage && currentConversation && messages.length <= 1) {
      handleSendMessage(params.initialMessage);
    }
  }, [params.initialMessage, currentConversation]);

  // Handle camera open from params
  useEffect(() => {
    if (params.openCamera === 'true') {
      handleCamera();
    }
  }, [params.openCamera]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async (messageText?: string, imageBase64?: string) => {
    const text = messageText || inputText.trim();
    if ((!text && !imageBase64) || isSending) return;

    // Haptic feedback + dismiss keyboard
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

    // Check if offline
    if (!isOnline) {
      queueMessage(text, imageBase64);
      const offlineMessage: ChatMessage = {
        id: `offline-${Date.now()}`,
        role: 'assistant',
        content: "I'm offline right now. I've saved your message and will respond when you're back online.",
        timestamp: Date.now(),
      };
      addMessage(offlineMessage);
      setIsSending(false);
      return;
    }

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
      case 'add_to_itinerary':
        if (placeCard) {
          const itineraryStore = useItineraryStore.getState();
          let activeItinerary = itineraryStore.getActiveItinerary();

          if (!activeItinerary) {
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
            { text: 'View Itinerary', onPress: () => router.push('/(tabs)/plan') },
            { text: 'OK', style: 'cancel' },
          ]);
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
    router.push('/voice');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tomo</Text>
          <View style={styles.headerSpacer} />
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

                {/* Assistant messages */}
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
                        onSave={() => {
                          if (message.placeCard) {
                            savePlace(
                              message.placeCard,
                              neighborhood || undefined,
                              undefined
                            );
                            safeHaptics.notification(NotificationFeedbackType.Success);
                          }
                        }}
                        isSaved={message.placeCard ? isPlaceSaved(message.placeCard.name, message.placeCard.coordinates) : false}
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

      <QuickActionsMenu
        visible={showQuickActions}
        timeOfDay={timeOfDay}
        weather={weatherCondition as WeatherCondition | undefined}
        isNavigating={false}
        onSelectAction={(message) => handleSendMessage(message)}
        onClose={() => setShowQuickActions(false)}
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
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  // Messages
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
  // User bubble
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
    fontSize: typography.sizes.lg,
    lineHeight: 26,
  },
  userText: {
    color: colors.chat.userText,
    fontSize: typography.sizes.lg,
    lineHeight: 26,
  },
  // Assistant
  assistantMessageContainer: {
    width: '100%',
    marginBottom: spacing.lg,
    paddingRight: spacing.xl,
  },
  assistantText: {
    color: colors.text.primary,
    fontSize: typography.sizes.lg,
    lineHeight: 26,
  },
  assistantTime: {
    color: colors.text.tertiary,
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
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
