import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Mic,
  Camera,
  ChevronRight,
  Clock,
  MapPin,
  Utensils,
  Coffee,
  Wine,
  Compass,
  Car,
  Moon,
  Sun,
  CloudRain,
} from 'lucide-react-native';
import { colors, spacing, typography, borders, shadows } from '../../constants/theme';
import { useLocationStore } from '../../stores/useLocationStore';
import { useWeatherStore } from '../../stores/useWeatherStore';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { useSavedPlacesStore } from '../../stores/useSavedPlacesStore';
import { useItineraryStore } from '../../stores/useItineraryStore';
import { useConversationStore } from '../../stores/useConversationStore';
import { useTimeOfDay } from '../../hooks/useTimeOfDay';
import { useLocation } from '../../hooks/useLocation';
import { useWeather } from '../../hooks/useWeather';
import { chat } from '../../services/openai';
import { searchNearbyPlaces } from '../../services/places';
import { safeHaptics, ImpactFeedbackStyle } from '../../utils/haptics';
import { NotificationContainer } from '../../components/NotificationToast';
import { OfflineBanner } from '../../components/OfflineBanner';
import type { PlaceCardData, DestinationContext } from '../../types';

// Helper to map Google Places price level string to number
function mapPriceLevel(googlePriceLevel?: string): 1 | 2 | 3 | 4 | undefined {
  if (!googlePriceLevel) return undefined;
  switch (googlePriceLevel) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 1;
    case 'PRICE_LEVEL_MODERATE':
      return 2;
    case 'PRICE_LEVEL_EXPENSIVE':
      return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 4;
    default:
      return undefined;
  }
}

// Helper to convert price level to dollar signs
function priceLevelToDollars(level?: 1 | 2 | 3 | 4): string {
  if (!level) return '$';
  return '$'.repeat(level);
}

// Quick action chips configuration
const QUICK_ACTIONS = {
  morning: [
    { id: 'eat', label: 'Eat', icon: Utensils, query: 'Find me a good breakfast spot nearby' },
    { id: 'coffee', label: 'Coffee', icon: Coffee, query: 'Find a great coffee shop nearby' },
    { id: 'explore', label: 'Explore', icon: Compass, query: 'What should I explore this morning?' },
    { id: 'move', label: 'Move', icon: MapPin, query: 'Where should I go today?' },
  ],
  afternoon: [
    { id: 'eat', label: 'Eat', icon: Utensils, query: 'Find me a good lunch spot nearby' },
    { id: 'explore', label: 'Explore', icon: Compass, query: 'What interesting places are nearby?' },
    { id: 'chill', label: 'Chill', icon: Coffee, query: 'Find a relaxing cafe or spot to chill' },
    { id: 'move', label: 'Move', icon: MapPin, query: 'What else should I see today?' },
  ],
  evening: [
    { id: 'eat', label: 'Eat', icon: Utensils, query: 'Find me a great dinner spot nearby' },
    { id: 'drinks', label: 'Drinks', icon: Wine, query: 'Find a good bar or place for drinks' },
    { id: 'chill', label: 'Chill', icon: Moon, query: 'Find a chill spot for the evening' },
    { id: 'ride', label: 'Ride', icon: Car, query: 'I need a ride back to my hotel' },
  ],
  night: [
    { id: 'eat', label: 'Eat', icon: Utensils, query: 'Find late night food nearby' },
    { id: 'drinks', label: 'Drinks', icon: Wine, query: 'Find a bar or nightlife spot' },
    { id: 'chill', label: 'Chill', icon: Moon, query: 'Find somewhere quiet and open late' },
    { id: 'ride', label: 'Ride', icon: Car, query: 'I need a ride home' },
  ],
};

interface RightNowSuggestion {
  id: string;
  title: string;
  subtitle: string;
  walkTime: string;
  priceLevel?: string;
  openStatus?: string;
  place?: PlaceCardData;
}

export default function TomoHomeScreen() {
  const router = useRouter();
  const timeOfDay = useTimeOfDay();

  // Hooks
  const { location } = useLocation();
  const { weather } = useWeather();

  // Store state
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);
  const temperatureUnit = usePreferencesStore((state) => state.temperatureUnit);
  const savedPlaces = useSavedPlacesStore((state) => state.places);
  // Get raw data and compute active itinerary with useMemo to avoid Zustand anti-pattern
  const itineraries = useItineraryStore((state) => state.itineraries);
  const activeItineraryId = useItineraryStore((state) => state.activeItineraryId);
  const activeItinerary = useMemo(() => {
    return itineraries.find((i) => i.id === activeItineraryId) || null;
  }, [itineraries, activeItineraryId]);
  const addMessage = useConversationStore((state) => state.addMessage);
  const startNewConversation = useConversationStore((state) => state.startNewConversation);

  // Local state
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<RightNowSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Get quick actions based on time of day
  const quickActions = useMemo(() => {
    return QUICK_ACTIONS[timeOfDay] || QUICK_ACTIONS.afternoon;
  }, [timeOfDay]);

  // Format temperature
  const displayTemperature = weatherTemperature
    ? temperatureUnit === 'F'
      ? Math.round((weatherTemperature * 9) / 5 + 32)
      : weatherTemperature
    : null;

  // Get time-appropriate greeting
  const getGreeting = () => {
    switch (timeOfDay) {
      case 'morning': return 'Morning';
      case 'afternoon': return 'Afternoon';
      case 'evening': return 'Evening';
      case 'night': return 'Night';
    }
  };

  // Get weather icon
  const getWeatherIcon = () => {
    if (!weatherCondition) return null;
    const condition = weatherCondition.toLowerCase();
    if (condition.includes('rain') || condition.includes('drizzle')) {
      return <CloudRain size={14} color={colors.text.secondary} />;
    }
    if (timeOfDay === 'night') {
      return <Moon size={14} color={colors.text.secondary} />;
    }
    return <Sun size={14} color={colors.text.secondary} />;
  };

  // Generate "Right Now" suggestions
  useEffect(() => {
    generateSuggestions();
  }, [coordinates, timeOfDay, weatherCondition]);

  const generateSuggestions = async () => {
    if (!coordinates) return;

    setLoadingSuggestions(true);

    try {
      const newSuggestions: RightNowSuggestion[] = [];

      // 1. Time-appropriate food suggestion
      const foodType = timeOfDay === 'morning' ? 'breakfast' :
                       timeOfDay === 'afternoon' ? 'lunch' :
                       timeOfDay === 'evening' ? 'dinner' : 'late night food';

      const foodPlaces = await searchNearbyPlaces(coordinates, 'restaurant', 1000);
      if (foodPlaces && foodPlaces.length > 0) {
        const topFood = foodPlaces[0];
        const foodPriceLevel = mapPriceLevel(topFood.priceLevel);
        newSuggestions.push({
          id: 'food-suggestion',
          title: topFood.displayName?.text || 'Local spot',
          subtitle: `Popular for ${foodType}`,
          walkTime: '5 min',
          priceLevel: priceLevelToDollars(foodPriceLevel),
          openStatus: topFood.regularOpeningHours?.openNow ? 'Open now' : 'Check hours',
          place: {
            name: topFood.displayName?.text || '',
            address: topFood.formattedAddress || '',
            coordinates: {
              latitude: topFood.location?.latitude || coordinates.latitude,
              longitude: topFood.location?.longitude || coordinates.longitude,
            },
            rating: topFood.rating,
            priceLevel: foodPriceLevel,
            openNow: topFood.regularOpeningHours?.openNow,
          },
        });
      }

      // 2. Check for nearby saved places
      const nearbySaved = savedPlaces.filter(place => {
        if (!place.coordinates || !coordinates) return false;
        const distance = Math.sqrt(
          Math.pow(place.coordinates.latitude - coordinates.latitude, 2) +
          Math.pow(place.coordinates.longitude - coordinates.longitude, 2)
        );
        return distance < 0.01; // Roughly 1km
      });

      if (nearbySaved.length > 0) {
        const saved = nearbySaved[0];
        newSuggestions.push({
          id: 'saved-nearby',
          title: saved.name,
          subtitle: 'Saved place nearby',
          walkTime: '3 min',
          place: saved,
        });
      }

      // 3. Evening-specific: bars/nightlife
      if (timeOfDay === 'evening' || timeOfDay === 'night') {
        const barPlaces = await searchNearbyPlaces(coordinates, 'bar', 1000);
        if (barPlaces && barPlaces.length > 0) {
          const topBar = barPlaces[0];
          const barPriceLevel = mapPriceLevel(topBar.priceLevel);
          newSuggestions.push({
            id: 'bar-suggestion',
            title: topBar.displayName?.text || 'Local bar',
            subtitle: 'Low-key spot nearby',
            walkTime: '5 min',
            priceLevel: priceLevelToDollars(barPriceLevel || 2),
            openStatus: 'Open now',
            place: {
              name: topBar.displayName?.text || '',
              address: topBar.formattedAddress || '',
              coordinates: {
                latitude: topBar.location?.latitude || coordinates.latitude,
                longitude: topBar.location?.longitude || coordinates.longitude,
              },
              rating: topBar.rating,
              priceLevel: barPriceLevel,
              openNow: topBar.regularOpeningHours?.openNow,
            },
          });
        }
      }

      // 4. Morning-specific: coffee
      if (timeOfDay === 'morning') {
        const cafePlaces = await searchNearbyPlaces(coordinates, 'cafe', 800);
        if (cafePlaces && cafePlaces.length > 0) {
          const topCafe = cafePlaces[0];
          const cafePriceLevel = mapPriceLevel(topCafe.priceLevel);
          newSuggestions.push({
            id: 'coffee-suggestion',
            title: topCafe.displayName?.text || 'Nearby cafe',
            subtitle: 'Great for morning coffee',
            walkTime: '4 min',
            priceLevel: priceLevelToDollars(cafePriceLevel || 1),
            openStatus: 'Open now',
            place: {
              name: topCafe.displayName?.text || '',
              address: topCafe.formattedAddress || '',
              coordinates: {
                latitude: topCafe.location?.latitude || coordinates.latitude,
                longitude: topCafe.location?.longitude || coordinates.longitude,
              },
              rating: topCafe.rating,
              priceLevel: cafePriceLevel,
              openNow: topCafe.regularOpeningHours?.openNow,
            },
          });
        }
      }

      // 5. Check itinerary for upcoming activities
      if (activeItinerary) {
        const now = new Date();
        const currentHour = now.getHours();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayActivities = activeItinerary.days
          .find(d => d.date >= todayStart && d.date < todayStart + 86400000)?.activities;

        if (todayActivities && todayActivities.length > 0) {
          // Find next activity based on current time slot
          const currentSlot = currentHour < 12 ? 'morning' :
                              currentHour < 17 ? 'afternoon' :
                              currentHour < 21 ? 'evening' : 'night';
          const slotOrder = ['morning', 'afternoon', 'evening', 'night'];
          const currentSlotIndex = slotOrder.indexOf(currentSlot);

          // Find next upcoming activity in current or future time slots
          const nextActivity = todayActivities.find(a => {
            const activitySlotIndex = slotOrder.indexOf(a.timeSlot);
            return activitySlotIndex >= currentSlotIndex;
          });

          if (nextActivity) {
            newSuggestions.push({
              id: 'itinerary-next',
              title: nextActivity.title,
              subtitle: `Planned for ${nextActivity.timeSlot}`,
              walkTime: nextActivity.place?.distance || '10 min',
              place: nextActivity.place,
            });
          }
        }
      }

      setSuggestions(newSuggestions.slice(0, 3)); // Max 3 suggestions
    } catch (error) {
      console.error('[TomoHome] Error generating suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Handle quick action tap
  const handleQuickAction = useCallback(async (action: typeof quickActions[0]) => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    // Navigate to chat with the query
    router.push({
      pathname: '/chat',
      params: { initialMessage: action.query },
    });
  }, [router]);

  // Handle suggestion tap
  const handleSuggestionTap = useCallback((suggestion: RightNowSuggestion) => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);

    if (suggestion.place) {
      // Navigate to place detail or start navigation
      router.push({
        pathname: '/chat',
        params: { initialMessage: `Tell me about ${suggestion.title}` },
      });
    }
  }, [router]);

  // Handle text input submission
  const handleSubmit = useCallback(() => {
    if (!inputText.trim()) return;

    safeHaptics.impact(ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    // Navigate to chat with the message
    router.push({
      pathname: '/chat',
      params: { initialMessage: inputText.trim() },
    });

    setInputText('');
  }, [inputText, router]);

  // Handle voice button
  const handleVoice = useCallback(() => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    router.push('/voice');
  }, [router]);

  // Handle camera button
  const handleCamera = useCallback(() => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/chat',
      params: { openCamera: 'true' },
    });
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <OfflineBanner />
      <NotificationContainer />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with location and weather */}
          <View style={styles.header}>
            <Text style={styles.locationText}>
              {neighborhood || 'Loading...'}
            </Text>
            <View style={styles.weatherRow}>
              {getWeatherIcon()}
              <Text style={styles.weatherText}>
                {displayTemperature ? `${displayTemperature}°` : ''}
                {displayTemperature && ' · '}
                {getGreeting()}
                {weatherCondition ? ` · ${weatherCondition}` : ''}
              </Text>
            </View>
          </View>

          {/* Main prompt */}
          <View style={styles.promptSection}>
            <Text style={styles.mainPrompt}>
              What do you want{'\n'}right now?
            </Text>
            <Text style={styles.subPrompt}>
              Food, places, rides, help — just ask.
            </Text>
          </View>

          {/* Input bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Find food nearby"
              placeholderTextColor={colors.text.tertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              keyboardAppearance="dark"
            />
            <TouchableOpacity style={styles.inputButton} onPress={handleVoice}>
              <Mic size={20} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputButton} onPress={handleCamera}>
              <Camera size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Quick action chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsContainer}
            contentContainerStyle={styles.chipsContent}
          >
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.chip}
                onPress={() => handleQuickAction(action)}
              >
                <action.icon size={16} color={colors.text.primary} />
                <Text style={styles.chipText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Right Now suggestions */}
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionTitle}>Right now</Text>

            {loadingSuggestions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent.primary} />
              </View>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.suggestionCard}
                  onPress={() => handleSuggestionTap(suggestion)}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                    <Text style={styles.suggestionSubtitle}>{suggestion.subtitle}</Text>
                    <View style={styles.suggestionMeta}>
                      <View style={styles.metaItem}>
                        <Clock size={12} color={colors.text.tertiary} />
                        <Text style={styles.metaText}>{suggestion.walkTime}</Text>
                      </View>
                      {suggestion.priceLevel && (
                        <View style={styles.metaItem}>
                          <Text style={styles.priceText}>{suggestion.priceLevel}</Text>
                        </View>
                      )}
                      {suggestion.openStatus && (
                        <View style={styles.metaItem}>
                          <Clock size={12} color={colors.status.success} />
                          <Text style={[styles.metaText, { color: colors.status.success }]}>
                            {suggestion.openStatus}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No suggestions yet. Ask Tomo anything!
                </Text>
              </View>
            )}
          </View>

          {/* Spacer for tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  locationText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  weatherText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },

  // Prompt section
  promptSection: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  mainPrompt: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 36,
  },
  subPrompt: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.input,
    borderRadius: borders.radius.xl,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  inputButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chips
  chipsContainer: {
    marginBottom: spacing.xl,
  },
  chipsContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },

  // Suggestions
  suggestionsSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  suggestionSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  suggestionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  priceText: {
    fontSize: typography.sizes.xs,
    color: colors.status.warning,
    fontWeight: typography.weights.medium,
  },

  // Loading & Empty
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
