import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Camera, DollarSign, MapPin, X, Send, ChevronDown } from 'lucide-react-native';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useTripStore } from '../stores/useTripStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { chatSimple } from '../services/claude';
import type { DestinationContext, ChatMessage } from '../types';

/**
 * Companion Mode Screen
 * Area-aware chat when user arrives at destination
 */
export default function CompanionScreen() {
  const router = useRouter();
  const timeOfDay = useTimeOfDay();

  // Store state
  const currentDestination = useNavigationStore((state) => state.currentDestination);
  const exitCompanionMode = useNavigationStore((state) => state.exitCompanionMode);
  const addVisit = useTripStore((state) => state.addVisit);
  const coordinates = useLocationStore((state) => state.coordinates);

  // Local state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initial greeting when companion mode starts
  useEffect(() => {
    if (currentDestination && messages.length === 0) {
      const greeting: ChatMessage = {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: `Welcome to ${currentDestination.title}! ${currentDestination.whatItIs}\n\n${currentDestination.whenToGo}\n\nWhat would you like to know?`,
        timestamp: Date.now(),
      };
      setMessages([greeting]);
    }
  }, [currentDestination]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending || !currentDestination) return;

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
      // Build context for Claude
      const context: DestinationContext = {
        location: currentDestination.coordinates,
        neighborhood: currentDestination.neighborhood,
        timeOfDay,
        weather: null, // Could fetch current weather
        budgetRemaining: 0, // Could get from budget store
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

      const response = await chatSimple(userMessage.content, context, messages);

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

  const handleDone = () => {
    if (currentDestination && coordinates) {
      // Record visit
      addVisit({
        placeId: currentDestination.placeId || currentDestination.id,
        name: currentDestination.title,
        neighborhood: currentDestination.neighborhood,
        city: currentDestination.neighborhood.split(',')[0]?.trim() || 'Unknown',
        country: currentDestination.neighborhood.split(',').pop()?.trim() || 'Unknown',
        coordinates: currentDestination.coordinates,
      });

      // Exit companion mode
      exitCompanionMode();

      // Return to home
      router.replace('/');
    }
  };

  const handleCamera = () => {
    // TODO: Implement camera functionality
    console.log('Open camera');
  };

  const handleAddExpense = () => {
    setShowExpenseModal(true);
  };

  const handleExploreNearby = () => {
    // TODO: Implement nearby exploration
    console.log('Explore nearby');
  };

  if (!currentDestination) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>No active destination</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
          <Text style={styles.backButtonText}>Go home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={[styles.header, shadows.sm]}>
            <View style={styles.headerContent}>
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>{currentDestination.title}</Text>
                <Text style={styles.headerSubtitle}>
                  {currentDestination.neighborhood} · Companion Mode
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleDone}>
                <ChevronDown size={24} color={colors.text.light.primary} />
              </TouchableOpacity>
            </View>
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

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCamera}>
              <Camera size={20} color={colors.text.light.primary} />
              <Text style={styles.actionText}>Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleAddExpense}>
              <DollarSign size={20} color={colors.text.light.primary} />
              <Text style={styles.actionText}>Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleExploreNearby}>
              <MapPin size={20} color={colors.text.light.primary} />
              <Text style={styles.actionText}>Nearby</Text>
            </TouchableOpacity>
          </View>

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
                <Send size={20} color={inputText.trim() ? colors.surface.card : colors.text.light.tertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>I'm done here</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  headerSubtitle: {
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
    backgroundColor: colors.interactive.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.card,
    ...shadows.sm,
  },
  messageText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  userText: {
    color: colors.surface.card,
  },
  assistantText: {
    color: colors.text.light.primary,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface.input,
    borderRadius: 12,
    gap: spacing.sm,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.light.primary,
  },
  inputContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface.card,
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
  doneButton: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface.input,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.text.light.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.interactive.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.surface.card,
  },
});
