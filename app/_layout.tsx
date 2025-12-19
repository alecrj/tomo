import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useOnboardingStore } from '../stores/useOnboardingStore';
import { useNotificationTriggers } from '../hooks/useNotificationTriggers';
import { useMemoryExtraction } from '../hooks/useMemoryExtraction';
import { initNetworkListener } from '../stores/useOfflineStore';
import { colors } from '../constants/theme';

// Component that runs background triggers
function BackgroundTriggers() {
  // Initialize notification triggers
  useNotificationTriggers();

  // Initialize memory auto-extraction from conversations
  useMemoryExtraction();

  // Initialize network listener for offline mode
  useEffect(() => {
    const cleanup = initNetworkListener();
    return cleanup;
  }, []);

  return null;
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  const hasCompletedOnboarding = useOnboardingStore(
    (state) => state.hasCompletedOnboarding
  );

  // Wait for Zustand to hydrate from AsyncStorage
  useEffect(() => {
    const checkHydration = async () => {
      // Small delay to ensure store is hydrated
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsReady(true);
    };
    checkHydration();
  }, []);

  // Handle navigation based on onboarding state
  useEffect(() => {
    if (!isReady) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    if (!hasCompletedOnboarding && !inOnboarding) {
      // User hasn't completed onboarding, redirect to onboarding
      router.replace('/onboarding');
    } else if (hasCompletedOnboarding && inOnboarding) {
      // User has completed onboarding but is on onboarding screen, redirect to home
      router.replace('/(tabs)');
    }
  }, [isReady, hasCompletedOnboarding, segments]);

  // Show loading while checking onboarding state
  if (!isReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <BackgroundTriggers />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="navigation" options={{ animation: 'fade' }} />
        <Stack.Screen name="voice" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="memory" />
        <Stack.Screen name="trip-recap" />
        <Stack.Screen name="itinerary" />
        <Stack.Screen name="destination" options={{ presentation: 'modal' }} />
        <Stack.Screen name="conversations" options={{ presentation: 'modal' }} />
        <Stack.Screen name="companion" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});
