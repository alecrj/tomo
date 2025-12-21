import React, { useEffect, Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../constants/theme';
import { initNetworkListener } from '../stores/useOfflineStore';
import { useMemoryExtraction } from '../hooks/useMemoryExtraction';
import { useNotificationTriggers } from '../hooks/useNotificationTriggers';

// Error Boundary to catch and display errors gracefully
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.emoji}>😵</Text>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={errorStyles.button} onPress={this.handleRetry}>
            <Text style={errorStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
});

// Validate required API keys on startup
function validateApiKeys(): void {
  const required = [
    { key: 'EXPO_PUBLIC_OPENAI_API_KEY', name: 'OpenAI' },
    { key: 'EXPO_PUBLIC_GOOGLE_PLACES_API_KEY', name: 'Google Places' },
  ];

  const optional = [
    { key: 'EXPO_PUBLIC_WEATHER_API_KEY', name: 'Weather' },
  ];

  const missing: string[] = [];
  const missingOptional: string[] = [];

  required.forEach(({ key, name }) => {
    const value = process.env[key];
    if (!value || value.length === 0) {
      missing.push(name);
    }
  });

  optional.forEach(({ key, name }) => {
    const value = process.env[key];
    if (!value || value.length === 0) {
      missingOptional.push(name);
    }
  });

  if (missing.length > 0) {
    console.error(
      `[Config] MISSING REQUIRED API KEYS: ${missing.join(', ')}\n` +
      'These features will not work. Please add them to your .env file.'
    );
  }

  if (missingOptional.length > 0) {
    console.warn(
      `[Config] Optional API keys not configured: ${missingOptional.join(', ')}\n` +
      'Some features may use fallback behavior.'
    );
  }

  if (missing.length === 0) {
  }
}

// Background services component
function BackgroundServices() {
  // Initialize memory extraction (auto-learns from chat)
  useMemoryExtraction();

  // Initialize notification triggers (background checks)
  useNotificationTriggers();

  // Initialize network listener and validate API keys
  useEffect(() => {
    // Validate API keys on startup
    validateApiKeys();

    // Start network listener
    const cleanup = initNetworkListener();
    return cleanup;
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <BackgroundServices />
        <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
        <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="navigation" options={{ animation: 'fade' }} />
        <Stack.Screen name="voice" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="memory" />
        <Stack.Screen name="trip-recap" />
        <Stack.Screen name="expenses" />
        <Stack.Screen name="itinerary" />
        <Stack.Screen name="destination" options={{ presentation: 'modal' }} />
        <Stack.Screen name="conversations" options={{ presentation: 'modal' }} />
        <Stack.Screen name="companion" />
        </Stack>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
