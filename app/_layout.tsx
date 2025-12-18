import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useOnboardingStore } from '../stores/useOnboardingStore';
import { useNotificationTriggers } from '../hooks/useNotificationTriggers';
import { useMemoryExtraction } from '../hooks/useMemoryExtraction';
import { initNetworkListener } from '../stores/useOfflineStore';

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

    if (!hasCompletedOnboarding && !inOnboarding) {
      // User hasn't completed onboarding, redirect to onboarding
      router.replace('/onboarding');
    } else if (hasCompletedOnboarding && inOnboarding) {
      // User has completed onboarding but is on onboarding screen, redirect to home
      router.replace('/');
    }
  }, [isReady, hasCompletedOnboarding, segments]);

  // Show loading while checking onboarding state
  if (!isReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <BackgroundTriggers />
      <Slot />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
