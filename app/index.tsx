import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// import { AnimatedBackground } from '../components/AnimatedBackground';
import { Header } from '../components/Header';
import { BudgetBar } from '../components/BudgetBar';
import { DestinationCard } from '../components/DestinationCard';
import { QuickActions } from '../components/QuickActions';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { ChatModal } from '../components/ChatModal';
import { SetupWarning } from '../components/SetupWarning';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import { useDestinationGeneration } from '../hooks/useDestinationGeneration';
import { checkAppSetup } from '../utils/setupCheck';
import { useWeatherStore } from '../stores/useWeatherStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useDestinationsStore } from '../stores/useDestinationsStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { getTransitDirections } from '../services/routes';
import { typography, colors, spacing } from '../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const timeOfDay = useTimeOfDay();
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // Check app setup on mount
  const setupCheck = checkAppSetup();

  // Location and weather hooks (automatically update stores)
  const { location } = useLocation();
  const { weather } = useWeather();

  // Destination generation (uses Claude API)
  const { regenerate } = useDestinationGeneration();

  // Store selectors
  const coordinates = useLocationStore((state) => state.coordinates);
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);
  const currentDestination = useDestinationsStore((state) => state.currentDestination);
  const loading = useDestinationsStore((state) => state.loading);
  const excludeDestination = useDestinationsStore((state) => state.excludeDestination);
  const startNavigation = useNavigationStore((state) => state.startNavigation);

  // Initialize stores with default budget
  useEffect(() => {
    // Initialize budget (one-time setup)
    // Users should configure this in settings for their trip
    const budgetStore = useBudgetStore.getState();
    if (budgetStore.dailyBudget === 0) {
      budgetStore.setTripBudget(70000, 7); // Default: 7-day trip, ¥70,000 total
      // No mock expenses - user will add their own
    }
  }, []);

  const handleOpenChat = () => {
    setShowChatModal(true);
  };

  const handleSeeMore = () => {
    if (!currentDestination) return;

    router.push({
      pathname: '/destination',
      params: {
        destination: JSON.stringify(currentDestination),
      },
    });
  };

  const handleTakeMeThere = async () => {
    if (!currentDestination) {
      Alert.alert('Error', 'No destination selected.');
      return;
    }

    // Simplified for Expo Go - navigation screen disabled
    Alert.alert(
      'Navigation',
      `Would open directions to ${currentDestination.title}.\n\nMaps feature requires native build.`,
      [{ text: 'OK' }]
    );

    /* DISABLED FOR EXPO GO - ENABLE IN NATIVE BUILD
    try {
      setFetchingRoute(true);
      const route = await getTransitDirections(coordinates, currentDestination.coordinates);
      if (!route) {
        Alert.alert('Route not found', 'Could not find transit directions.');
        return;
      }
      startNavigation(currentDestination, route);
      router.push({
        pathname: '/navigation',
        params: {
          destination: JSON.stringify(currentDestination),
          route: JSON.stringify(route),
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Could not fetch directions.');
    } finally {
      setFetchingRoute(false);
    }
    */
  };

  const handleSomethingElse = () => {
    if (currentDestination) {
      excludeDestination(currentDestination.id);
      console.log('Excluded:', currentDestination.title);
      regenerate();
    }
  };

  return (
    <View style={styles.container}>
      {/* <AnimatedBackground timeOfDay={timeOfDay} weatherCondition={weatherCondition} /> */}

      <SafeAreaView style={styles.content} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Header
              timeOfDay={timeOfDay}
              location={location.neighborhood || undefined}
              weather={weatherCondition && weatherTemperature ? {
                condition: weatherCondition,
                temperature: weatherTemperature,
              } : undefined}
              onSettingsPress={() => router.push('/settings')}
            />

            {/* Setup Warning */}
            {setupCheck.issues.length > 0 && (
              <SetupWarning issues={setupCheck.issues} />
            )}

            {/* Budget Bar */}
            <BudgetBar timeOfDay={timeOfDay} />

            {/* Section Label */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>TONIGHT</Text>
            </View>

            {/* Destination Card or Loading */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>✨ Finding the perfect place...</Text>
              </View>
            ) : currentDestination ? (
              <>
                <DestinationCard
                  destination={currentDestination}
                  userLocation={coordinates}
                  onSeeMore={handleSeeMore}
                  onTakeMeThere={handleTakeMeThere}
                />
                {/* Something Else Button */}
                <View style={styles.somethingElseContainer}>
                  <TouchableOpacity
                    style={styles.somethingElseButton}
                    onPress={handleSomethingElse}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text style={styles.somethingElseText}>Something else</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>🗺️ Getting your location...</Text>
              </View>
            )}

            {/* Chat Area (placeholder for now) */}
            <View style={styles.chatArea}>
              <Text style={styles.chatPlaceholder}>Chat responses will appear here...</Text>
            </View>

            {/* Quick Actions */}
            <QuickActions
              timeOfDay={timeOfDay}
              onCamera={() => console.log('Camera pressed')}
              onAddExpense={() => setShowExpenseModal(true)}
              onStamps={() => console.log('Stamps pressed')}
            />

            {/* Bottom padding for chat input */}
            <View style={styles.bottomPadding} />
          </ScrollView>

          {/* Chat Input - Tap to open modal */}
          <TouchableOpacity
            style={styles.chatInputContainer}
            onPress={handleOpenChat}
            activeOpacity={0.7}
          >
            <View style={styles.chatInputPlaceholder}>
              <Text style={styles.chatInputText}>Ask me anything...</Text>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
      />

      {/* Chat Modal */}
      <ChatModal
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for chat input
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...typography.presets.sectionLabel,
    color: colors.text.light.secondary,
  },
  loadingContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.text.light.secondary,
    textAlign: 'center',
  },
  somethingElseContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  somethingElseButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.text.light.tertiary,
  },
  somethingElseText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.light.secondary,
  },
  chatArea: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 100,
  },
  chatPlaceholder: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.tertiary,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 40,
  },
  chatInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface.modal,
    borderTopWidth: 1,
    borderTopColor: colors.surface.input,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  chatInputPlaceholder: {
    backgroundColor: colors.surface.input,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatInputText: {
    fontSize: typography.sizes.base,
    color: colors.text.light.tertiary,
  },
});
