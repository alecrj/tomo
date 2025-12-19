import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../stores/useOnboardingStore';
import { colors } from '../constants/theme';

/**
 * Root index - handles initial routing based on onboarding state.
 */
export default function Index() {
  const router = useRouter();
  const hasCompletedOnboarding = useOnboardingStore(
    (state) => state.hasCompletedOnboarding
  );

  useEffect(() => {
    // Small delay to ensure stores are hydrated
    const timer = setTimeout(() => {
      if (hasCompletedOnboarding) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [hasCompletedOnboarding, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});
