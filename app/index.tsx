import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Pressable,
  Image,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Send, Mic, Camera, Settings } from 'lucide-react-native';
import { colors, spacing, typography } from '../constants/theme';
import { chat } from '../services/claude';
import { takePhoto, pickPhoto } from '../services/camera';
import { startRecording, stopRecording, cancelRecording, transcribeAudio } from '../services/voice';
import { useLocationStore } from '../stores/useLocationStore';
import { useWeatherStore } from '../stores/useWeatherStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useTripStore } from '../stores/useTripStore';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import { detectCurrency } from '../utils/currency';
import type { DestinationContext, ChatMessage } from '../types';

export default function ChatScreen() {
  const router = useRouter();
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
  const spentToday = budgetStore.spentToday();
  const homeBase = usePreferencesStore((state) => state.homeBase);
  const walkingTolerance = usePreferencesStore((state) => state.walkingTolerance);
  const budgetLevel = usePreferencesStore((state) => state.budgetLevel);
  const dietary = usePreferencesStore((state) => state.dietary);
  const interests = usePreferencesStore((state) => state.interests);
  const avoidCrowds = usePreferencesStore((state) => state.avoidCrowds);
  const visits = useTripStore((state) => state.visits);
  const totalWalkingMinutes = useTripStore((state) => state.totalWalkingMinutes);

  // Local state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showBudgetBar, setShowBudgetBar] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Detect currency
  const currency = coordinates ? detectCurrency(coordinates) : { code: 'USD', symbol: '$', name: 'US Dollar' };

  // Initialize budget if not set
  useEffect(() => {
    if (dailyBudget === 0) {
      budgetStore.setTripBudget(10000, 5); // Default: 5-day trip, 10,000 in local currency
    }
  }, [dailyBudget]);

  // Initial greeting when app opens
  useEffect(() => {
    if (messages.length === 0 && coordinates) {
      const cityCountry = neighborhood || 'your current location';
      const greeting: ChatMessage = {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: `Hi! I'm Tomo, your AI travel companion.

I can see you're in ${cityCountry}.

I know your exact location, the time, weather, and your budget. Just talk to me naturally!

What would you like to do? You can:
• Type or ask anything
• 🎤 Tap microphone to record voice
• 📷 Send photos for me to analyze

Where should we start?`,
        timestamp: Date.now(),
      };
      setMessages([greeting]);
    }
  }, [coordinates, neighborhood, messages.length]);

  // Auto-scroll to bottom
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

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || '[Image]',
      timestamp: Date.now(),
      image: imageBase64,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    try {
      // Build full context
      const context: DestinationContext = {
        location: coordinates || { latitude: 0, longitude: 0 },
        neighborhood: neighborhood || 'unknown location',
        timeOfDay,
        weather: weatherCondition && weatherTemperature
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

      // Enhanced message with location and currency context
      const systemContext = coordinates
        ? `\n\n[SYSTEM CONTEXT: User is at GPS ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)} in ${neighborhood || 'unknown'}. Local currency: ${currency.name} (${currency.symbol}). Current time: ${timeOfDay}. Weather: ${weatherCondition || 'unknown'}. Budget remaining today: ${currency.symbol}${budgetRemaining}. Use local currency for ALL prices. Be conversational, helpful, and specific. Include exact places with addresses when relevant.]`
        : '';

      const enhancedMessage = text + systemContext;

      const response = await chat(enhancedMessage, context, messages, imageBase64);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I'm having trouble responding. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
        'Choose an option',
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
      // Stop recording
      setIsRecording(false);
      const audioUri = await stopRecording();
      if (audioUri) {
        const transcription = await transcribeAudio(audioUri);
        if (transcription) {
          handleSendMessage(transcription);
        }
      }
    } else {
      // Start recording
      const started = await startRecording();
      if (started) {
        setIsRecording(true);
      }
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header with Budget Bar */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                {neighborhood || 'Loading location...'}
              </Text>
              {weatherTemperature && (
                <Text style={styles.weatherText}>
                  {weatherTemperature}°C • {timeOfDay}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
            >
              <Settings size={22} color={colors.text.light.secondary} />
            </TouchableOpacity>
          </View>

          {/* Collapsible Budget Bar */}
          {showBudgetBar && dailyBudget > 0 && (
            <Pressable
              style={styles.budgetBar}
              onPress={() => setShowBudgetBar(!showBudgetBar)}
            >
              <View style={styles.budgetInfo}>
                <Text style={styles.budgetLabel}>Today's Budget</Text>
                <Text style={styles.budgetAmount}>
                  {currency.symbol}{budgetRemaining.toFixed(0)} / {currency.symbol}{dailyBudget.toFixed(0)}
                </Text>
              </View>
              <View style={styles.budgetBarContainer}>
                <View style={styles.budgetBarBackground} />
                <View
                  style={[
                    styles.budgetBarFill,
                    {
                      width: `${Math.min((spentToday / dailyBudget) * 100, 100)}%`,
                      backgroundColor:
                        spentToday > dailyBudget
                          ? colors.status.error
                          : spentToday > dailyBudget * 0.8
                          ? colors.status.warning
                          : colors.status.success,
                    },
                  ]}
                />
              </View>
            </Pressable>
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
                    resizeMode="cover"
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
                <Text
                  style={[
                    styles.messageTime,
                    message.role === 'user' ? styles.userTime : styles.assistantTime,
                  ]}
                >
                  {new Date(message.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
            {isSending && (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <Text style={[styles.messageText, styles.assistantText]}>
                  Thinking...
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Input Bar - iMessage Style */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              {/* Camera Button */}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleCamera}
              >
                <Camera size={24} color={colors.text.light.secondary} />
              </TouchableOpacity>

              {/* Text Input */}
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Message Tomo..."
                  placeholderTextColor={colors.text.light.tertiary}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={() => handleSendMessage()}
                  returnKeyType="send"
                  multiline
                  maxLength={1000}
                />
              </View>

              {/* Voice or Send Button */}
              {inputText.trim() ? (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => handleSendMessage()}
                  disabled={isSending}
                >
                  <Send size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    isRecording && styles.recordingButton,
                  ]}
                  onPress={handleVoicePress}
                >
                  <Mic
                    size={24}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.light.primary,
  },
  weatherText: {
    fontSize: 13,
    color: colors.text.light.secondary,
    marginTop: 2,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  budgetBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  budgetLabel: {
    fontSize: 13,
    color: colors.text.light.secondary,
  },
  budgetAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.light.primary,
  },
  budgetBarContainer: {
    height: 4,
    position: 'relative',
  },
  budgetBarBackground: {
    position: 'absolute',
    width: '100%',
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
  },
  budgetBarFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
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
  messageBubble: {
    maxWidth: '75%',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    fontSize: 16,
    lineHeight: 21,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  assistantTime: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  textInputContainer: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#F9F9F9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    color: colors.text.light.primary,
    minHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    backgroundColor: '#007AFF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
});
