import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Mic,
  Camera,
  Send,
  MapPin,
  Moon,
  Sun,
  CloudRain,
} from 'lucide-react-native';
import { colors, spacing, typography, borders } from '../../constants/theme';
import { useLocationStore } from '../../stores/useLocationStore';
import { useWeatherStore } from '../../stores/useWeatherStore';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { useConversationStore } from '../../stores/useConversationStore';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useMemoryStore } from '../../stores/useMemoryStore';
import { useTripStore } from '../../stores/useTripStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useSavedPlacesStore } from '../../stores/useSavedPlacesStore';
import { useItineraryStore } from '../../stores/useItineraryStore';
import { useTimeOfDay } from '../../hooks/useTimeOfDay';
import { useLocation } from '../../hooks/useLocation';
import { useWeather } from '../../hooks/useWeather';
import { useOfflineStore } from '../../stores/useOfflineStore';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../../utils/haptics';
import { NotificationContainer } from '../../components/NotificationToast';
import { OfflineBanner } from '../../components/OfflineBanner';
import { TypingIndicator } from '../../components/TypingIndicator';
import { PlaceCard } from '../../components/PlaceCard';
import { chat, generateItinerary } from '../../services/openai';
import { takePhoto, pickPhoto } from '../../services/camera';
import { detectCurrency } from '../../utils/currency';
import type { ChatMessage, DestinationContext, Destination, MessageAction } from '../../types';

// Category chips - simple shortcuts
const CATEGORY_CHIPS = [
  { label: 'Food nearby', message: 'Find me something good to eat nearby' },
  { label: 'Coffee', message: 'Where can I get good coffee around here?' },
  { label: 'Things to do', message: 'What are some interesting things to do near me?' },
  { label: 'Nightlife', message: 'Where should I go for drinks tonight?' },
];

export default function HomeScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const timeOfDay = useTimeOfDay();

  // Hooks
  useLocation();
  useWeather();

  // Store state
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);
  const temperatureUnit = usePreferencesStore((state) => state.temperatureUnit);
  const homeBase = usePreferencesStore((state) => state.homeBase);
  const walkingTolerance = usePreferencesStore((state) => state.walkingTolerance);
  const budgetLevel = usePreferencesStore((state) => state.budgetLevel);
  const dietary = usePreferencesStore((state) => state.dietary);
  const interests = usePreferencesStore((state) => state.interests);
  const avoidCrowds = usePreferencesStore((state) => state.avoidCrowds);

  // Trip/budget state
  const visits = useTripStore((state) => state.visits);
  const totalWalkingMinutes = useTripStore((state) => state.totalWalkingMinutes);
  const currentTrip = useTripStore((state) => state.currentTrip);
  const budgetStore = useBudgetStore();
  const dailyBudget = budgetStore.dailyBudget;
  const budgetRemaining = budgetStore.remainingToday();

  // Conversation state
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

  // Navigation
  const viewDestination = useNavigationStore((state) => state.viewDestination);

  // Saved places
  const savePlace = useSavedPlacesStore((state) => state.savePlace);
  const isPlaceSaved = useSavedPlacesStore((state) => state.isPlaceSaved);

  // Offline
  const isOnline = useOfflineStore((state) => state.isOnline);
  const queueMessage = useOfflineStore((state) => state.queueMessage);

  // Local state
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Currency detection
  const currency = coordinates
    ? detectCurrency(coordinates)
    : { code: 'USD', symbol: '$', name: 'US Dollar' };

  // Initialize conversation
  useEffect(() => {
    if (!currentConversationId && coordinates) {
      startNewConversation(neighborhood || undefined, currentTrip?.id);
    }
  }, [currentConversationId, coordinates]);

  // Auto-scroll when new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Format temperature
  const displayTemperature = weatherTemperature
    ? temperatureUnit === 'F'
      ? Math.round((weatherTemperature * 9) / 5 + 32)
      : weatherTemperature
    : null;

  // Get time-appropriate greeting
  const getGreeting = () => {
    switch (timeOfDay) {
      case 'morning': return 'Morning';
      case 'afternoon': return 'Afternoon';
      case 'evening': return 'Evening';
      case 'night': return 'Night';
    }
  };

  // Get weather icon
  const getWeatherIcon = () => {
    if (!weatherCondition) return null;
    const condition = weatherCondition.toLowerCase();
    if (condition.includes('rain') || condition.includes('drizzle')) {
      return <CloudRain size={14} color={colors.text.tertiary} />;
    }
    if (timeOfDay === 'night') {
      return <Moon size={14} color={colors.text.tertiary} />;
    }
    return <Sun size={14} color={colors.text.tertiary} />;
  };

  // Build context for AI
  const buildContext = useCallback((): DestinationContext => {
    return {
      location: coordinates || { latitude: 0, longitude: 0 },
      neighborhood: neighborhood || 'unknown location',
      timeOfDay,
      weather: weatherCondition && weatherTemperature ? {
        condition: weatherCondition,
        temperature: weatherTemperature,
        description: `${weatherCondition}, ${weatherTemperature}°C`,
        humidity: 0,
      } : null,
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
  }, [coordinates, neighborhood, timeOfDay, weatherCondition, weatherTemperature, budgetRemaining, dailyBudget, homeBase, walkingTolerance, budgetLevel, dietary, interests, avoidCrowds, visits, totalWalkingMinutes]);

  // Send message
  const handleSendMessage = useCallback(async (messageText?: string, imageBase64?: string) => {
    const text = messageText || inputText.trim();
    if ((!text && !imageBase64) || isSending) return;

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
      const context = buildContext();
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
  }, [inputText, isSending, isOnline, queueMessage, addMessage, buildContext, getMemoryContext, coordinates, neighborhood, currency, timeOfDay, weatherCondition, budgetRemaining, messages]);

  // Handle chip tap
  const handleChipPress = useCallback((message: string) => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    handleSendMessage(message);
  }, [handleSendMessage]);

  // Handle action buttons
  const handleAction = useCallback((action: MessageAction, placeCard?: ChatMessage['placeCard']) => {
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
      case 'view_itinerary':
        router.push('/(tabs)/plan');
        break;
    }
  }, [neighborhood, viewDestination, router, handleSendMessage]);

  // Handle voice
  const handleVoice = useCallback(() => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    router.push('/voice');
  }, [router]);

  // Handle camera
  const handleCamera = useCallback(() => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);

    const promptOptions = [
      'Translate this text/menu for me',
      'What is this place?',
      'Tell me about this',
      'How much does this cost?',
    ];

    const handleImageWithPrompt = async (image: string) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: 'What do you want to know?',
            options: ['Cancel', ...promptOptions],
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex > 0 && buttonIndex <= promptOptions.length) {
              handleSendMessage(promptOptions[buttonIndex - 1], image);
            }
          }
        );
      } else {
        Alert.alert('What do you want to know?', undefined, [
          { text: 'Cancel', style: 'cancel' },
          ...promptOptions.map((prompt) => ({
            text: prompt,
            onPress: () => handleSendMessage(prompt, image),
          })),
        ]);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            const image = await takePhoto();
            if (image) handleImageWithPrompt(image);
          } else if (buttonIndex === 2) {
            const image = await pickPhoto();
            if (image) handleImageWithPrompt(image);
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
            if (image) handleImageWithPrompt(image);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const image = await pickPhoto();
            if (image) handleImageWithPrompt(image);
          },
        },
      ]);
    }
  }, [handleSendMessage]);

  // Render empty state (no messages)
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyGreeting}>
        {getGreeting()}.
      </Text>
      <Text style={styles.emptySubtext}>
        What would you like to explore?
      </Text>
    </View>
  );

  // Render messages
  const renderMessages = () => (
    <>
      {messages.map((message) => (
        <View key={message.id}>
          {/* User messages */}
          {message.role === 'user' && (
            <View style={styles.userBubble}>
              {message.image && (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${message.image}` }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.userText}>{message.content}</Text>
            </View>
          )}

          {/* Assistant messages */}
          {message.role === 'assistant' && (
            <View style={styles.assistantContainer}>
              <Text style={styles.assistantText}>{message.content}</Text>

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
                      savePlace(message.placeCard, neighborhood || undefined);
                      safeHaptics.notification(NotificationFeedbackType.Success);
                    }
                  }}
                  isSaved={message.placeCard ? isPlaceSaved(message.placeCard.name, message.placeCard.coordinates) : false}
                />
              )}
            </View>
          )}
        </View>
      ))}

      {/* Typing indicator */}
      {isSending && <TypingIndicator />}
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <OfflineBanner />
      <NotificationContainer />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Header - Minimal location context */}
          <View style={styles.header}>
            <View style={styles.locationRow}>
              <MapPin size={12} color={colors.text.tertiary} />
              <Text style={styles.locationText}>
                {neighborhood || 'Loading...'}
              </Text>
              {displayTemperature && (
                <>
                  <Text style={styles.separator}>·</Text>
                  {getWeatherIcon()}
                  <Text style={styles.weatherText}>
                    {displayTemperature}°
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Scrollable content */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? renderEmptyState() : renderMessages()}
          </ScrollView>

          {/* Category chips - show when no messages */}
          {messages.length === 0 && (
            <View style={styles.chipsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {CATEGORY_CHIPS.map((chip) => (
                  <TouchableOpacity
                    key={chip.label}
                    style={styles.chip}
                    onPress={() => handleChipPress(chip.message)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Input bar */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask me anything..."
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
                <View style={styles.inputActions}>
                  <TouchableOpacity style={styles.inputIconButton} onPress={handleVoice}>
                    <Mic size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputIconButton} onPress={handleCamera}>
                    <Camera size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
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
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    fontWeight: typography.weights.medium,
  },
  separator: {
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  weatherText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },

  // Scroll content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyGreeting: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
  },

  // Messages
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: colors.chat.userBubble,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.xl,
    borderBottomRightRadius: borders.radius.xs,
    marginBottom: spacing.md,
  },
  userText: {
    fontSize: typography.sizes.base,
    color: colors.chat.userText,
    lineHeight: 22,
  },
  messageImage: {
    width: '100%',
    height: 150,
    borderRadius: borders.radius.md,
    marginBottom: spacing.sm,
  },
  assistantContainer: {
    marginBottom: spacing.lg,
    paddingRight: spacing['2xl'],
  },
  assistantText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 24,
  },

  // Chips
  chipsContainer: {
    paddingBottom: spacing.md,
  },
  chipsScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.full,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },

  // Input
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface.input,
    borderRadius: borders.radius.xl,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
});
