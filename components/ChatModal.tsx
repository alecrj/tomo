import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Send } from 'lucide-react-native';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { chat } from '../services/claude';
import { useLocationStore } from '../stores/useLocationStore';
import { useWeatherStore } from '../stores/useWeatherStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useTripStore } from '../stores/useTripStore';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { detectCurrency } from '../utils/currency';
import type { DestinationContext, ChatMessage } from '../types';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ChatModal({ visible, onClose }: ChatModalProps) {
  const timeOfDay = useTimeOfDay();
  const scrollViewRef = useRef<ScrollView>(null);

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
  const visits = useTripStore((state) => state.visits);
  const totalWalkingMinutes = useTripStore((state) => state.totalWalkingMinutes);

  // Local state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Initial greeting when modal opens
  useEffect(() => {
    if (visible && messages.length === 0) {
      const location = neighborhood || 'your current location';
      const greeting: ChatMessage = {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: `Hi! I'm in ${location} with you. I can see your exact GPS location, the time, weather, and your budget. What would you like to know?`,
        timestamp: Date.now(),
      };
      setMessages([greeting]);
    }
  }, [visible, neighborhood]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Reset messages when modal closes
  const handleClose = () => {
    setMessages([]);
    setInputText('');
    onClose();
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    try {
      // Detect currency based on location
      const currency = coordinates ? detectCurrency(coordinates) : { code: 'USD', symbol: '$', name: 'US Dollar' };

      // Build full context for Claude
      const context: DestinationContext = {
        location: coordinates || { latitude: 0, longitude: 0 },
        neighborhood: neighborhood || 'your current location',
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
        visitedPlaces: visits.slice(-5), // Last 5 visits
        completedStamps: [],
        excludedToday: [],
        totalWalkingToday: totalWalkingMinutes,
      };

      // Enhanced prompt with precise location and currency
      const enhancedMessage = coordinates
        ? `${userMessage.content}\n\n[CONTEXT: User is at GPS coordinates ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)} in ${neighborhood || 'unknown location'}. Local currency is ${currency.name} (${currency.symbol}). Use this currency for all price references.]`
        : userMessage.content;

      const response = await chat(enhancedMessage, context, messages);

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
        content: "Sorry, I'm having trouble responding right now. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={styles.modal}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerInfo}>
                  <Text style={styles.title}>Chat with Tomo</Text>
                  <Text style={styles.subtitle}>
                    {neighborhood || 'Your current location'} · {timeOfDay}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <X size={24} color={colors.text.light.primary} />
                </TouchableOpacity>
              </View>

              {/* Messages */}
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
                  <TextInput
                    style={styles.input}
                    placeholder="Ask anything..."
                    placeholderTextColor={colors.text.light.tertiary}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSendMessage}
                    returnKeyType="send"
                    blurOnSubmit={false}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!inputText.trim() || isSending}
                  >
                    <Send
                      size={20}
                      color={inputText.trim() ? colors.surface.card : colors.text.light.tertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  modal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: spacing['2xl'],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  messageBubble: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    maxWidth: '80%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
  },
  messageText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#000000',
  },
  inputContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.input,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.light.primary,
    paddingVertical: spacing.lg,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.interactive.primary,
    borderRadius: 18,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface.input,
  },
});
