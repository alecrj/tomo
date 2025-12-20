/**
 * Voice Mode Screen
 *
 * Real-time voice conversation with Tomo using OpenAI's gpt-realtime model.
 * Uses WebRTC for low-latency, natural voice-to-voice interaction.
 *
 * How it works:
 * 1. Screen opens → WebRTC connection established
 * 2. User speaks → Server VAD detects speech → Audio streamed to OpenAI
 * 3. OpenAI responds → Audio streams back → Plays automatically
 * 4. User can interrupt Tomo mid-sentence
 * 5. No push-to-talk needed - natural conversation flow
 */

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
  Phone,
  PhoneOff,
} from 'lucide-react-native';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { colors, spacing, borders, typography } from '../constants/theme';
import { useLocationStore } from '../stores/useLocationStore';
import { usePreferencesStore, LANGUAGE_NAMES } from '../stores/usePreferencesStore';
import {
  initRealtimeSession,
  closeRealtimeSession,
  setMicrophoneMuted,
  interruptResponse,
  RealtimeConnectionState,
  VoiceActivityState,
  RealtimeMessage,
} from '../services/realtime';

export default function VoiceScreen() {
  const router = useRouter();

  // Location context for system prompt
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const coordinates = useLocationStore((state) => state.coordinates);

  // Language preference
  const language = usePreferencesStore((state) => state.language);
  const languageName = LANGUAGE_NAMES[language] || 'English';

  // Connection and voice state
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('disconnected');
  const [voiceState, setVoiceState] = useState<VoiceActivityState>('idle');
  const [isMuted, setIsMuted] = useState(false);

  // Conversation
  const [transcript, setTranscript] = useState<string>('');
  const [assistantText, setAssistantText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;

  // Animation refs for cleanup
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const waveAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);

  // Scroll ref
  const scrollRef = useRef<ScrollView>(null);

  // Build system prompt with location context
  const buildSystemPrompt = useCallback(() => {
    const locationContext = coordinates
      ? `User is in ${neighborhood || 'unknown location'} (${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}).`
      : '';

    return `You are Tomo, a friendly AI travel companion helping a traveler via voice.

CRITICAL LANGUAGE RULE:
- ALWAYS respond in ${languageName}. This is the user's preferred language.
- Never switch to another language unless the user explicitly asks.
- Even if you detect they're in Japan/Thailand/Korea, still respond in ${languageName}.

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
  }, [coordinates, neighborhood, languageName]);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      console.log('[VoiceScreen] Initializing realtime session...');

      const success = await initRealtimeSession(
        {
          onConnectionStateChange: (state) => {
            console.log('[VoiceScreen] Connection state:', state);
            setConnectionState(state);
            if (state === 'connected') {
              safeHaptics.notification(NotificationFeedbackType.Success);
            }
          },
          onVoiceActivityChange: (state) => {
            console.log('[VoiceScreen] Voice activity:', state);
            setVoiceState(state);
          },
          onTranscript: (text, isFinal) => {
            console.log('[VoiceScreen] Transcript:', text, 'final:', isFinal);
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
            console.error('[VoiceScreen] Error:', err);
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
      console.log('[VoiceScreen] Cleaning up...');
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

  // Pulse animation for listening state
  useEffect(() => {
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
      pulseAnimationRef.current = null;
    }

    if (voiceState === 'listening') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimationRef.current = animation;
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
        pulseAnimationRef.current = null;
      }
    };
  }, [voiceState, pulseAnim]);

  // Wave animation for speaking state
  useEffect(() => {
    waveAnimationsRef.current.forEach((anim) => anim.stop());
    waveAnimationsRef.current = [];

    if (voiceState === 'speaking') {
      const animateWave = (anim: Animated.Value, delay: number): Animated.CompositeAnimation => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 300,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 300,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const anim1 = animateWave(waveAnim1, 0);
      const anim2 = animateWave(waveAnim2, 100);
      const anim3 = animateWave(waveAnim3, 200);

      waveAnimationsRef.current = [anim1, anim2, anim3];
      anim1.start();
      anim2.start();
      anim3.start();
    } else {
      waveAnim1.setValue(0.3);
      waveAnim2.setValue(0.3);
      waveAnim3.setValue(0.3);
    }

    return () => {
      waveAnimationsRef.current.forEach((anim) => anim.stop());
      waveAnimationsRef.current = [];
    };
  }, [voiceState, waveAnim1, waveAnim2, waveAnim3]);

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setMicrophoneMuted(newMuted);
  }, [isMuted]);

  // Handle interrupt (tap during speaking to stop Tomo)
  const handleInterrupt = useCallback(() => {
    if (voiceState === 'speaking') {
      safeHaptics.impact(ImpactFeedbackStyle.Medium);
      interruptResponse();
    }
  }, [voiceState]);

  // Handle close
  const handleClose = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    closeRealtimeSession();
    router.back();
  };

  // Get status text
  const getStatusText = () => {
    if (error) return error;

    switch (connectionState) {
      case 'connecting':
        return 'Connecting to Tomo...';
      case 'error':
        return 'Connection failed';
      case 'disconnected':
        return 'Disconnected';
      case 'connected':
        if (isMuted) return 'Microphone muted';
        switch (voiceState) {
          case 'listening':
            return 'Listening...';
          case 'processing':
            return 'Thinking...';
          case 'speaking':
            return 'Tomo is speaking (tap to interrupt)';
          default:
            return 'Ready — just start talking';
        }
    }
  };

  // Get main indicator icon
  const getMainIndicator = () => {
    if (connectionState === 'connecting') {
      return <Loader2 size={40} color={colors.text.secondary} />;
    }

    if (connectionState !== 'connected') {
      return <PhoneOff size={40} color={colors.status.error} />;
    }

    if (voiceState === 'speaking') {
      return (
        <View style={styles.waveContainer}>
          <Animated.View
            style={[
              styles.wave,
              { transform: [{ scaleY: waveAnim1 }] },
            ]}
          />
          <Animated.View
            style={[
              styles.wave,
              { transform: [{ scaleY: waveAnim2 }] },
            ]}
          />
          <Animated.View
            style={[
              styles.wave,
              { transform: [{ scaleY: waveAnim3 }] },
            ]}
          />
        </View>
      );
    }

    if (voiceState === 'listening') {
      return <Mic size={40} color={colors.status.success} />;
    }

    if (voiceState === 'processing') {
      return <Loader2 size={40} color={colors.accent.primary} />;
    }

    return <Mic size={40} color={colors.text.primary} />;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Phone size={16} color={connectionState === 'connected' ? colors.status.success : colors.text.tertiary} />
            <Text style={styles.headerTitle}>Voice Mode</Text>
          </View>
          <TouchableOpacity
            style={[styles.muteButton, isMuted && styles.muteButtonActive]}
            onPress={handleMuteToggle}
            disabled={connectionState !== 'connected'}
          >
            {isMuted ? (
              <MicOff size={20} color={colors.status.error} />
            ) : (
              <Mic size={20} color={colors.text.secondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Conversation */}
        <ScrollView
          ref={scrollRef}
          style={styles.conversationContainer}
          contentContainerStyle={styles.conversationContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !transcript && !assistantText && connectionState === 'connected' && (
            <View style={styles.emptyState}>
              <MessageSquare size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>Just start talking</Text>
              <Text style={styles.emptySubtext}>
                Ask me anything — directions, recommendations, translations, or just chat.
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
                  msg.type === 'user' ? styles.userText : styles.assistantTextStyle,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          ))}

          {/* Live transcript */}
          {transcript && (
            <View style={[styles.messageBubble, styles.userBubble, styles.liveBubble]}>
              <Text style={[styles.messageText, styles.userText]}>{transcript}...</Text>
            </View>
          )}

          {/* Live assistant response */}
          {assistantText && (
            <View style={[styles.messageBubble, styles.assistantBubble, styles.liveBubble]}>
              <Text style={[styles.messageText, styles.assistantTextStyle]}>{assistantText}</Text>
            </View>
          )}
        </ScrollView>

        {/* Main Voice Indicator */}
        <TouchableOpacity
          style={styles.voiceIndicatorContainer}
          onPress={handleInterrupt}
          disabled={voiceState !== 'speaking'}
          activeOpacity={voiceState === 'speaking' ? 0.7 : 1}
        >
          <Animated.View
            style={[
              styles.voiceIndicator,
              connectionState === 'connected' && voiceState === 'listening' && styles.voiceIndicatorActive,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {getMainIndicator()}
          </Animated.View>
        </TouchableOpacity>

        {/* Status Text */}
        <Text style={[styles.statusText, error && styles.statusTextError]}>
          {getStatusText()}
        </Text>

        {/* Connection indicator */}
        <View style={styles.connectionIndicator}>
          <View
            style={[
              styles.connectionDot,
              connectionState === 'connected' && styles.connectionDotConnected,
              connectionState === 'connecting' && styles.connectionDotConnecting,
              connectionState === 'error' && styles.connectionDotError,
            ]}
          />
          <Text style={styles.connectionText}>
            {connectionState === 'connected' ? 'Connected to gpt-realtime' : connectionState}
          </Text>
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  muteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  muteButtonActive: {
    backgroundColor: colors.status.errorMuted,
  },

  // Conversation
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
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: typography.sizes.base,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
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
  assistantTextStyle: {
    color: colors.text.primary,
  },

  // Voice Indicator
  voiceIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  voiceIndicator: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.border.default,
  },
  voiceIndicatorActive: {
    borderColor: colors.status.success,
    backgroundColor: colors.status.successMuted,
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

  // Status
  statusText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  statusTextError: {
    color: colors.status.error,
  },

  // Connection indicator
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.tertiary,
  },
  connectionDotConnected: {
    backgroundColor: colors.status.success,
  },
  connectionDotConnecting: {
    backgroundColor: colors.status.warning,
  },
  connectionDotError: {
    backgroundColor: colors.status.error,
  },
  connectionText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
});
