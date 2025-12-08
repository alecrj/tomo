import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { Header } from '../components/Header';
import { BudgetBar } from '../components/BudgetBar';
import { DestinationCard } from '../components/DestinationCard';
import { QuickActions } from '../components/QuickActions';
import { ChatInput } from '../components/ChatInput';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import { Destination } from '../types';
import { useWeatherStore } from '../stores/useWeatherStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useDestinationsStore } from '../stores/useDestinationsStore';
import { typography, colors, spacing } from '../constants/theme';

// Mock destination for development
const MOCK_DESTINATION: Destination = {
  id: '1',
  title: 'Golden Gai',
  description: 'Tiny bars, big vibes',
  whatItIs: '200+ tiny bars in 6 narrow alleys. Each seats 5-7 people. Cover charges ¥300-500, drinks ¥600-800.',
  whenToGo: 'After 8pm — earlier is dead. Weeknights less crowded.',
  neighborhood: 'Shinjuku',
  category: 'nightlife',
  whyNow: 'Perfect for evening, bars just opening',
  placeId: 'ChIJ_____mock_place_id',
  address: 'Kabukicho, Shinjuku',
  coordinates: { latitude: 35.6938, longitude: 139.7034 },
  priceLevel: 2,
  estimatedCost: 3000,
  transitPreview: {
    method: 'train',
    line: 'Yamanote',
    totalMinutes: 15,
    description: '15 min by train',
  },
  spots: [
    {
      placeId: 'spot_1',
      name: 'Albatross',
      description: '3 floors, good for first-timers',
      rating: 4.4,
      priceLevel: 2,
    },
    {
      placeId: 'spot_2',
      name: 'Death Match in Hell',
      description: 'Horror/metal theme, wild decor',
      rating: 4.3,
      priceLevel: 2,
    },
  ],
};

export default function HomeScreen() {
  const timeOfDay = useTimeOfDay();
  const [chatInput, setChatInput] = useState('');

  // Location and weather hooks (automatically update stores)
  const { location } = useLocation();
  const { weather } = useWeather();

  // Store selectors
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);
  const currentDestination = useDestinationsStore((state) => state.currentDestination);
  const setDestination = useDestinationsStore((state) => state.setDestination);
  const excludeDestination = useDestinationsStore((state) => state.excludeDestination);

  // Initialize stores with mock data
  useEffect(() => {
    // Initialize budget
    const budgetStore = useBudgetStore.getState();
    if (budgetStore.dailyBudget === 0) {
      budgetStore.setTripBudget(70000, 7); // 7-day trip, ¥70,000 total
      // Add a mock expense for today
      budgetStore.addExpense({
        id: '1',
        amount: 3500,
        category: 'food',
        note: 'Lunch at Tsukiji',
        timestamp: Date.now(),
      });
    }

    // Initialize destination
    if (!currentDestination) {
      setDestination(MOCK_DESTINATION);
    }
  }, [currentDestination, setDestination]);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      // TODO: Implement chat functionality
      console.log('Send message:', chatInput);
      setChatInput('');
    }
  };

  const handleSeeMore = () => {
    // TODO: Navigate to destination detail screen
    console.log('See more:', currentDestination?.title);
  };

  const handleTakeMeThere = () => {
    // TODO: Navigate to navigation screen
    console.log('Take me there:', currentDestination?.title);
  };

  const handleSomethingElse = () => {
    if (currentDestination) {
      excludeDestination(currentDestination.id);
      // TODO: Generate new destination via Claude API
      console.log('Generating new destination...');
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground timeOfDay={timeOfDay} weatherCondition={weatherCondition} />

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
            />

            {/* Budget Bar */}
            <BudgetBar timeOfDay={timeOfDay} />

            {/* Section Label */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>TONIGHT</Text>
            </View>

            {/* Destination Card */}
            {currentDestination && (
              <DestinationCard
                destination={currentDestination}
                onSeeMore={handleSeeMore}
                onTakeMeThere={handleTakeMeThere}
              />
            )}

            {/* Something Else Button */}
            <View style={styles.somethingElseContainer}>
              <TouchableOpacity
                style={styles.somethingElseButton}
                onPress={handleSomethingElse}
                activeOpacity={0.7}
              >
                <Text style={styles.somethingElseText}>Something else</Text>
              </TouchableOpacity>
            </View>

            {/* Chat Area (placeholder for now) */}
            <View style={styles.chatArea}>
              <Text style={styles.chatPlaceholder}>Chat responses will appear here...</Text>
            </View>

            {/* Quick Actions */}
            <QuickActions
              timeOfDay={timeOfDay}
              onCamera={() => console.log('Camera pressed')}
              onAddExpense={() => console.log('Add expense pressed')}
              onStamps={() => console.log('Stamps pressed')}
            />

            {/* Bottom padding for chat input */}
            <View style={styles.bottomPadding} />
          </ScrollView>

          {/* Chat Input */}
          <ChatInput
            value={chatInput}
            onChangeText={setChatInput}
            onSubmit={handleSendMessage}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
