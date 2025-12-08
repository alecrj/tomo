import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { Header } from '../components/Header';
import { BudgetBar } from '../components/BudgetBar';
import { MoveCard } from '../components/MoveCard';
import { QuickActions } from '../components/QuickActions';
import { ChatInput } from '../components/ChatInput';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import { Move } from '../types';
import { useWeatherStore } from '../stores/useWeatherStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useMovesStore } from '../stores/useMovesStore';

// Mock data for development
const MOCK_MOVES: Move[] = [
  {
    id: '1',
    title: 'Golden Gai Bar Crawl',
    description: 'Explore 200+ tiny bars in atmospheric alleyways',
    neighborhood: 'Shinjuku',
    category: 'nightlife',
    duration: 180,
    transit: {
      method: 'train',
      line: 'Yamanote',
      direction: 'Shinjuku',
      stops: 3,
      totalMinutes: 15,
      exitInfo: 'East Exit',
    },
    whyNow: 'Perfect for evening, bars just opening',
    priceLevel: 2,
    estimatedCost: 3000,
    highlights: [
      'Tiny bars with 5-7 seats each',
      'Unique atmosphere and locals',
    ],
    startingPoint: {
      name: 'Golden Gai',
      address: 'Kabukicho, Shinjuku',
      coordinates: { latitude: 35.6938, longitude: 139.7034 },
    },
  },
  {
    id: '2',
    title: 'Omoide Yokocho Yakitori',
    description: 'Smoky alley of grilled meat under the tracks',
    neighborhood: 'Shinjuku',
    category: 'food',
    duration: 90,
    transit: {
      method: 'train',
      line: 'Yamanote',
      direction: 'Shinjuku',
      stops: 3,
      totalMinutes: 15,
      exitInfo: 'West Exit',
    },
    whyNow: 'Dinner time, freshly grilled',
    priceLevel: 1,
    estimatedCost: 1500,
    highlights: [
      'Authentic yakitori stalls',
      'Budget-friendly and delicious',
    ],
    startingPoint: {
      name: 'Omoide Yokocho',
      address: 'Nishi-Shinjuku, Shinjuku',
      coordinates: { latitude: 35.6917, longitude: 139.7006 },
    },
  },
  {
    id: '3',
    title: 'TeamLab Borderless',
    description: 'Immersive digital art that you walk through',
    neighborhood: 'Azabudai',
    category: 'culture',
    duration: 120,
    transit: {
      method: 'train',
      line: 'Oedo Line',
      direction: 'Roppongi',
      stops: 5,
      totalMinutes: 25,
      exitInfo: 'Azabudai Hills Exit',
    },
    whyNow: 'Evening slots available',
    priceLevel: 3,
    estimatedCost: 4200,
    highlights: [
      'Stunning digital installations',
      'Interactive art experiences',
    ],
    startingPoint: {
      name: 'TeamLab Borderless',
      address: 'Azabudai Hills, Minato',
      coordinates: { latitude: 35.6586, longitude: 139.7454 },
    },
  },
];

export default function HomeScreen() {
  const timeOfDay = useTimeOfDay();
  const [chatInput, setChatInput] = useState('');

  // Location and weather hooks (automatically update stores)
  const { location } = useLocation();
  const { weather: weatherData } = useWeather();

  // Store selectors
  const weatherCondition = useWeatherStore((state) => state.condition);
  const moves = useMovesStore((state) => state.moves);
  const selectedMoveId = useMovesStore((state) => state.selectedMoveId);
  const selectMove = useMovesStore((state) => state.selectMove);
  const setMoves = useMovesStore((state) => state.setMoves);

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

    // Initialize moves
    setMoves(MOCK_MOVES);
  }, [setMoves]);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      // TODO: Implement chat functionality
      console.log('Send message:', chatInput);
      setChatInput('');
    }
  };

  const handleMovePress = (moveId: string) => {
    selectMove(selectedMoveId === moveId ? null : moveId);
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
              weather={weatherData.weather.condition && weatherData.weather.temperature ? {
                condition: weatherData.weather.condition,
                temperature: weatherData.weather.temperature,
              } : undefined}
            />

            {/* Budget Bar */}
            <BudgetBar timeOfDay={timeOfDay} />

            {/* Move Cards */}
            <View style={styles.movesContainer}>
              {moves.map((move) => (
                <MoveCard
                  key={move.id}
                  move={move}
                  isSelected={selectedMoveId === move.id}
                  onPress={() => handleMovePress(move.id)}
                />
              ))}
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
  movesContainer: {
    marginVertical: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
