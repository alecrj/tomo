import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  Loader2,
  MessageSquare,
} from 'lucide-react-native';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { colors, spacing, borders, typography } from '../constants/theme';
import { useLocationStore } from '../stores/useLocationStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import {
  initRealtimeSession,
  closeRealtimeSession,
  startListening,
  stopListening,
  sendTextMessage,
  RealtimeConnectionState,
  VoiceActivityState,
  RealtimeMessage,
} from '../services/realtime';

export default function VoiceScreen() {
  const router = useRouter();

  // Location context
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const coordinates = useLocationStore((state) => state.coordinates);

  // State
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('disconnected');
  const [voiceState, setVoiceState] = useState<VoiceActivityState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [assistantText, setAssistantText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;

  // Scroll ref
  const scrollRef = useRef<ScrollView>(null);

  // Build system prompt with location context
  const buildSystemPrompt = useCallback(() => {
    const locationContext = coordinates
      ? `User is in ${neighborhood || 'unknown location'} (${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}).`
      : '';

    return `You are Tomo, a friendly AI travel companion helping a traveler via voice.

${locationContext}

VOICE RESPONSE RULES:
- Keep responses SHORT and NATURAL for voice (1-2 sentences when possible)
- Be conversational and warm, like a local friend
- For place recommendations, give the name and key details briefly
- If asked for directions, summarize the route simply
- Don't use markdown, bullet points, or formatting
- Speak naturally as if having a conversation

You can help with:
- Finding restaurants, cafes, attractions nearby
- Getting directions and navigation tips
- Translating phrases
- Local customs and tips
- General questions about travel
- Anything else a helpful friend would help with`;
  }, [coordinates, neighborhood]);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      const success = await initRealtimeSession(
        {
          onConnectionStateChange: (state) => {
            setConnectionState(state);
            if (state === 'connected') {
              safeHaptics.notification(NotificationFeedbackType.Success);
            }
          },
          onVoiceActivityChange: setVoiceState,
          onTranscript: (text, isFinal) => {
            setTranscript(text);
            if (isFinal && text) {
              setMessages((prev) => [
                ...prev,
                { type: 'user', content: text, timestamp: Date.now() },
              ]);
              setTranscript('');
            }
          },
          onAssistantResponse: (text) => {
            setAssistantText((prev) => prev + text);
          },
          onError: (err) => {
            setError(err);
            safeHaptics.notification(NotificationFeedbackType.Error);
          },
        },
        buildSystemPrompt()
      );

      if (!success) {
        setError('Failed to initialize voice session');
      }
    };

    initSession();

    return () => {
      closeRealtimeSession();
    };
  }, [buildSystemPrompt]);

  // When assistant finishes speaking, save message
  useEffect(() => {
    if (voiceState === 'idle' && assistantText) {
      setMessages((prev) => [
        ...prev,
        { type: 'assistant', content: assistantText, timestamp: Date.now() },
      ]);
      setAssistantText('');
    }
  }, [voiceState, assistantText]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, transcript, assistantText]);

  // Pulse animation for mic button
  useEffect(() => {
    if (voiceState === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState, pulseAnim]);

  // Wave animation for speaking state
  useEffect(() => {
    if (voiceState === 'speaking') {
      const animateWave = (anim: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 300,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      animateWave(waveAnim1, 0);
      animateWave(waveAnim2, 100);
      animateWave(waveAnim3, 200);
    } else {
      waveAnim1.setValue(0);
      waveAnim2.setValue(0);
      waveAnim3.setValue(0);
    }
  }, [voiceState, waveAnim1, waveAnim2, waveAnim3]);

  const handleMicPress = useCallback(async () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);

    if (voiceState === 'listening') {
      await stopListening();
    } else if (voiceState === 'idle' && connectionState === 'connected') {
      await startListening();
    }
  }, [voiceState, connectionState]);

  const handleClose = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    closeRealtimeSession();
    router.back();
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return error || 'Connection error';
      case 'disconnected':
        return 'Disconnected';
      case 'connected':
        switch (voiceState) {
          case 'listening':
            return 'Listening...';
          case 'processing':
            return 'Processing...';
          case 'speaking':
            return 'Tomo is speaking...';
          default:
            return 'Tap to speak';
        }
    }
  };

  const getMicIcon = () => {
    if (voiceState === 'listening') {
      return <MicOff size={32} color={colors.status.error} />;
    }
    if (voiceState === 'speaking') {
      return <Volume2 size={32} color={colors.accent.primary} />;
    }
    if (voiceState === 'processing') {
      return <Loader2 size={32} color={colors.text.secondary} />;
    }
    return <Mic size={32} color={colors.text.primary} />;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice Mode</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Conversation */}
        <ScrollView
          ref={scrollRef}
          style={styles.conversationContainer}
          contentContainerStyle={styles.conversationContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !transcript && !assistantText && (
            <View style={styles.emptyState}>
              <MessageSquare size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>
                Tap the microphone and start speaking
              </Text>
              <Text style={styles.emptySubtext}>
                Ask me anything - directions, recommendations, translations...
              </Text>
            </View>
          )}

          {messages.map((msg, index) => (
            <View
              key={`${msg.timestamp}-${index}`}
              style={[
                styles.messageBubble,
                msg.type === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.type === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          ))}

          {/* Live transcript */}
          {transcript && (
            <View style={[styles.messageBubble, styles.userBubble, styles.liveBubble]}>
              <Text style={[styles.messageText, styles.userText]}>
                {transcript}...
              </Text>
            </View>
          )}

          {/* Live assistant response */}
          {assistantText && (
            <View style={[styles.messageBubble, styles.assistantBubble, styles.liveBubble]}>
              <Text style={[styles.messageText, styles.assistantText]}>
                {assistantText}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Voice Activity Indicator */}
        <View style={styles.voiceIndicator}>
          {voiceState === 'speaking' && (
            <View style={styles.waveContainer}>
              <Animated.View
                style={[
                  styles.wave,
                  {
                    transform: [{ scaleY: waveAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.wave,
                  {
                    transform: [{ scaleY: waveAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.wave,
                  {
                    transform: [{ scaleY: waveAnim3.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                  },
                ]}
              />
            </View>
          )}
        </View>

        {/* Status Text */}
        <Text style={styles.statusText}>{getStatusText()}</Text>

        {/* Mic Button */}
        <View style={styles.micContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.micButton,
                voiceState === 'listening' && styles.micButtonActive,
                connectionState !== 'connected' && styles.micButtonDisabled,
              ]}
              onPress={handleMicPress}
              disabled={connectionState !== 'connected' || voiceState === 'processing' || voiceState === 'speaking'}
              activeOpacity={0.8}
            >
              {getMicIcon()}
            </TouchableOpacity>
          </Animated.View>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  closeButton: {
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
  conversationContainer: {
    flex: 1,
  },
  conversationContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.sizes.base,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 280,
  },
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
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderBottomLeftRadius: borders.radius.xs,
  },
  liveBubble: {
    opacity: 0.8,
  },
  messageText: {
    fontSize: typography.sizes.lg,
    lineHeight: 26,
  },
  userText: {
    color: colors.chat.userText,
  },
  assistantText: {
    color: colors.text.primary,
  },
  voiceIndicator: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 40,
  },
  wave: {
    width: 6,
    height: 40,
    backgroundColor: colors.accent.primary,
    borderRadius: 3,
  },
  statusText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  micContainer: {
    alignItems: 'center',
    paddingBottom: spacing['2xl'],
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.accent.primary,
  },
  micButtonActive: {
    backgroundColor: colors.status.errorMuted,
    borderColor: colors.status.error,
  },
  micButtonDisabled: {
    opacity: 0.5,
    borderColor: colors.text.tertiary,
  },
});
