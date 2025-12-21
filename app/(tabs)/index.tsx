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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
// Animations disabled temporarily for stability
// import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  Mic,
  Camera,
  Send,
  MapPin,
  Moon,
  Sun,
  CloudRain,
  Utensils,
  Coffee,
  Sparkles,
  Music,
  Compass,
} from 'lucide-react-native';
import { colors, spacing, typography, borders, shadows, getTimeGradient } from '../../constants/theme';
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
import { PlaceCardSkeleton, MessageSkeleton } from '../../components/SkeletonLoader';
import { chat, generateItinerary } from '../../services/openai';
import { takePhoto, pickPhoto } from '../../services/camera';
import { detectCurrency } from '../../utils/currency';
import type { ChatMessage, DestinationContext, Destination, MessageAction } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category chips with icons
const CATEGORY_CHIPS = [
  { label: 'Food', icon: Utensils, message: 'Find me something good to eat nearby', color: colors.categories.food },
  { label: 'Coffee', icon: Coffee, message: 'Where can I get good coffee around here?', color: colors.categories.coffee },
  { label: 'Explore', icon: Compass, message: 'What are some interesting things to do near me?', color: colors.categories.activity },
  { label: 'Nightlife', icon: Music, message: 'Where should I go for drinks tonight?', color: colors.categories.nightlife },
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
  const [inputFocused, setInputFocused] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

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
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
  };

  // Get contextual subtext
  const getSubtext = () => {
    if (!neighborhood) return "Let's explore together";
    if (timeOfDay === 'morning') return `Ready to start the day in ${neighborhood}?`;
    if (timeOfDay === 'afternoon') return `What are you in the mood for?`;
    if (timeOfDay === 'evening') return `Time for dinner or drinks?`;
    return `Still exploring ${neighborhood}?`;
  };

  // Get weather icon
  const getWeatherIcon = () => {
    if (!weatherCondition) return null;
    const condition = weatherCondition.toLowerCase();
    if (condition.includes('rain') || condition.includes('drizzle')) {
      return <CloudRain size={16} color={colors.text.secondary} />;
    }
    if (timeOfDay === 'night') {
      return <Moon size={16} color={colors.text.secondary} />;
    }
    return <Sun size={16} color={colors.accent.primary} />;
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

      // Auto-expand the card if present
      if (response.placeCard) {
        setExpandedCardId(`${assistantMessage.id}-0`);
      }

      safeHaptics.notification(NotificationFeedbackType.Success);
      addMessage(assistantMessage);
    } catch (error) {
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
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
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

  // Get gradient colors for time of day
  const gradientColors = getTimeGradient(timeOfDay);

  // Render empty state (no messages)
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {/* Main greeting */}
      <View>
        <Text style={styles.greeting}>{getGreeting()}</Text>
      </View>

      <View>
        <Text style={styles.subtext}>{getSubtext()}</Text>
      </View>

      {/* Context row */}
      {(neighborhood || displayTemperature) && (
        <View style={styles.contextRow}>
          {neighborhood && (
            <View style={styles.contextItem}>
              <MapPin size={14} color={colors.accent.primary} />
              <Text style={styles.contextText}>{neighborhood}</Text>
            </View>
          )}
          {displayTemperature && (
            <View style={styles.contextItem}>
              {getWeatherIcon()}
              <Text style={styles.contextText}>{displayTemperature}°</Text>
            </View>
          )}
        </View>
      )}

      {/* AI tip */}
      <View style={styles.tipContainer}>
        <Sparkles size={16} color={colors.accent.primary} />
        <Text style={styles.tipText}>
          Try asking: "What's a hidden gem near me?" or "Plan my evening"
        </Text>
      </View>
    </View>
  );

  // Render messages
  const renderMessages = () => (
    <>
      {messages.map((message, index) => (
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

              {/* Multiple PlaceCards with expand/collapse */}
              {message.placeCards && message.placeCards.length > 0 ? (
                <View style={styles.placeCardsContainer}>
                  {message.placeCards.map((card, cardIndex) => {
                    const cardId = `${message.id}-${cardIndex}`;
                    const isExpanded = expandedCardId === cardId;
                    const isFirst = cardIndex === 0;

                    return (
                      <View key={cardId}>
                        {/* Collapsed card (just header) */}
                        {!isExpanded && (
                          <TouchableOpacity
                            style={styles.collapsedCard}
                            onPress={() => {
                              safeHaptics.impact(ImpactFeedbackStyle.Light);
                              setExpandedCardId(cardId);
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={styles.collapsedCardContent}>
                              <View style={styles.collapsedCardLeft}>
                                <Text style={styles.collapsedCardName} numberOfLines={1}>
                                  {card.name}
                                </Text>
                                {card.whyRecommended && (
                                  <Text style={styles.collapsedCardReason} numberOfLines={1}>
                                    {card.whyRecommended}
                                  </Text>
                                )}
                              </View>
                              <View style={styles.collapsedCardRight}>
                                <Text style={styles.collapsedCardMeta}>
                                  {card.distance} · {card.rating ? `★ ${card.rating.toFixed(1)}` : ''}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        )}

                        {/* Expanded card (full PlaceCard) */}
                        {isExpanded && (
                          <PlaceCard
                            placeCard={card}
                            currencySymbol={currency.symbol}
                            onTakeMeThere={() =>
                              handleAction({ label: 'Take me there', type: 'navigate' }, card)
                            }
                            onSomethingElse={() =>
                              handleAction({ label: 'Something else', type: 'regenerate' })
                            }
                            onSave={() => {
                              savePlace(card, neighborhood || undefined);
                              safeHaptics.notification(NotificationFeedbackType.Success);
                            }}
                            isSaved={isPlaceSaved(card.name, card.coordinates)}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : message.placeCard ? (
                // Legacy single placeCard support
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
              ) : null}
            </View>
          )}
        </View>
      ))}

      {/* Loading state with skeleton */}
      {isSending && (
        <View>
          <MessageSkeleton />
          <PlaceCardSkeleton />
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Subtle gradient background */}
      <LinearGradient
        colors={[gradientColors[0], gradientColors[1], colors.background.primary]}
        style={styles.backgroundGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />

      <OfflineBanner />
      <NotificationContainer />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
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
                {CATEGORY_CHIPS.map((chip, index) => {
                  const IconComponent = chip.icon;
                  return (
                    <TouchableOpacity
                      key={chip.label}
                      style={styles.chip}
                      onPress={() => handleChipPress(chip.message)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.chipIconContainer, { backgroundColor: `${chip.color}20` }]}>
                        <IconComponent size={16} color={chip.color} />
                      </View>
                      <Text style={styles.chipText}>{chip.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Input bar */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.inputWrapper,
              inputFocused && styles.inputWrapperFocused
            ]}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask Tomo anything..."
                placeholderTextColor={colors.text.tertiary}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
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
                  <Send size={18} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={styles.inputActions}>
                  <TouchableOpacity style={styles.inputIconButton} onPress={handleVoice}>
                    <Mic size={22} color={colors.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputIconButton} onPress={handleCamera}>
                    <Camera size={22} color={colors.text.secondary} />
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
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
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
    paddingBottom: 80,
    paddingTop: spacing['4xl'],
  },
  greeting: {
    fontSize: 40,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  subtext: {
    fontSize: typography.sizes.xl,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  contextRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing['3xl'],
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contextText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.muted,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borders.radius.xl,
    marginTop: spacing.xl,
  },
  tipText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
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
    ...shadows.sm,
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
    paddingRight: spacing.lg,
  },
  assistantText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 24,
  },
  placeCardsContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  collapsedCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  collapsedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  collapsedCardLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  collapsedCardName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  collapsedCardReason: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  collapsedCardRight: {
    alignItems: 'flex-end',
  },
  collapsedCardMeta: {
    fontSize: typography.sizes.sm,
    color: colors.accent.primary,
    fontWeight: typography.weights.medium,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: borders.radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 52,
  },
  inputWrapperFocused: {
    borderColor: colors.accent.primary,
    ...shadows.glowSoft,
  },
  textInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    maxHeight: 100,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inputIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    ...shadows.glowSoft,
  },
});
