import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  Navigation,
  Heart,
  Moon,
  Sun,
  CloudRain,
  MapPin,
} from 'lucide-react-native';
import { colors, spacing, typography, borders } from '../../constants/theme';
import { useLocationStore } from '../../stores/useLocationStore';
import { useWeatherStore } from '../../stores/useWeatherStore';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { useSavedPlacesStore } from '../../stores/useSavedPlacesStore';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useMemoryStore } from '../../stores/useMemoryStore';
import { useTimeOfDay } from '../../hooks/useTimeOfDay';
import { useLocation } from '../../hooks/useLocation';
import { useWeather } from '../../hooks/useWeather';
import { searchNearbyPlaces } from '../../services/places';
import { getWalkingDirections } from '../../services/routes';
import { useOfflineStore } from '../../stores/useOfflineStore';
import { safeHaptics, ImpactFeedbackStyle } from '../../utils/haptics';
import { NotificationContainer } from '../../components/NotificationToast';
import { OfflineBanner } from '../../components/OfflineBanner';
import type { PlaceCardData } from '../../types';

// Smart recommendation with personalized reason
interface SmartRecommendation {
  place: PlaceCardData;
  reason: string; // Personalized explanation
  walkTime: string;
  isOpen: boolean;
}

export default function TomoHomeScreen() {
  const router = useRouter();
  const timeOfDay = useTimeOfDay();

  // Hooks
  useLocation();
  useWeather();

  // Store state
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);
  const temperatureUnit = usePreferencesStore((state) => state.temperatureUnit);
  const savedPlaces = useSavedPlacesStore((state) => state.places);
  const savePlace = useSavedPlacesStore((state) => state.savePlace);
  const isPlaceSavedFn = useSavedPlacesStore((state) => state.isPlaceSaved);
  const viewDestination = useNavigationStore((state) => state.viewDestination);
  const memories = useMemoryStore((state) => state.memories);
  const isOnline = useOfflineStore((state) => state.isOnline);

  // Local state
  const [inputText, setInputText] = useState('');
  const [recommendation, setRecommendation] = useState<SmartRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Get user preferences from memory
  const userPreferences = useMemo(() => {
    const likes = memories.filter(m => m.type === 'like').map(m => m.content);
    const dislikes = memories.filter(m => m.type === 'dislike').map(m => m.content);
    const personalInfo = memories.filter(m => m.type === 'personal_info').map(m => m.content);
    return { likes, dislikes, personalInfo };
  }, [memories]);

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
      return <CloudRain size={16} color={colors.text.secondary} />;
    }
    if (timeOfDay === 'night') {
      return <Moon size={16} color={colors.text.secondary} />;
    }
    return <Sun size={16} color={colors.text.secondary} />;
  };

  // Get food emoji based on time
  const getFoodEmoji = () => {
    switch (timeOfDay) {
      case 'morning': return '☕';
      case 'afternoon': return '🍜';
      case 'evening': return '🍽️';
      case 'night': return '🍺';
      default: return '🍴';
    }
  };

  // Generate ONE smart recommendation
  const generateSmartRecommendation = useCallback(async () => {
    if (!coordinates || !isOnline) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Determine search type based on time
      const searchType = timeOfDay === 'morning' ? 'cafe' :
                         timeOfDay === 'night' ? 'bar' : 'restaurant';

      // Search for places
      const places = await searchNearbyPlaces(coordinates, searchType, 1000);

      if (!places || places.length === 0) {
        setRecommendation(null);
        setIsLoading(false);
        return;
      }

      // Pick the best match (first result from Google is usually good)
      const topPlace = places[0];

      // Get walking time
      let walkTime = '5 min walk';
      if (topPlace.location) {
        try {
          const route = await getWalkingDirections(
            coordinates,
            { latitude: topPlace.location.latitude, longitude: topPlace.location.longitude }
          );
          if (route?.totalDuration) {
            walkTime = `${Math.round(route.totalDuration)} min walk`;
          }
        } catch {
          // Keep default walk time
        }
      }

      // Generate personalized reason
      let reason = '';
      const placeName = topPlace.displayName?.text || 'This spot';

      if (userPreferences.likes.length > 0) {
        const likedThing = userPreferences.likes[0];
        reason = `${placeName} — might match your love for ${likedThing}.`;
      } else if (timeOfDay === 'morning') {
        reason = `${placeName} — great way to start your ${getGreeting().toLowerCase()}.`;
      } else if (timeOfDay === 'evening') {
        reason = `${placeName} — popular for ${getGreeting().toLowerCase()} dining.`;
      } else if (timeOfDay === 'night') {
        reason = `${placeName} — good vibes for tonight.`;
      } else {
        reason = `${placeName} — highly rated and close by.`;
      }

      // Build the recommendation
      const rec: SmartRecommendation = {
        place: {
          placeId: topPlace.id,
          name: topPlace.displayName?.text || 'Nearby spot',
          address: topPlace.formattedAddress || '',
          coordinates: {
            latitude: topPlace.location?.latitude || coordinates.latitude,
            longitude: topPlace.location?.longitude || coordinates.longitude,
          },
          rating: topPlace.rating,
          priceLevel: mapPriceLevel(topPlace.priceLevel),
          openNow: topPlace.regularOpeningHours?.openNow,
          photo: topPlace.photos?.[0]?.name,
        },
        reason,
        walkTime,
        isOpen: topPlace.regularOpeningHours?.openNow ?? true,
      };

      setRecommendation(rec);
      setIsSaved(isPlaceSavedFn(rec.place.name, rec.place.coordinates));
    } catch (error) {
      console.error('[TomoHome] Error generating recommendation:', error);
      setRecommendation(null);
    } finally {
      setIsLoading(false);
    }
  }, [coordinates, timeOfDay, userPreferences, isOnline, isPlaceSavedFn]);

  // Generate recommendation on mount and when context changes
  useEffect(() => {
    generateSmartRecommendation();
  }, [coordinates, timeOfDay]);

  // Handle "Take me there" - direct to navigation
  const handleTakeMeThere = useCallback(() => {
    if (!recommendation?.place) return;

    safeHaptics.impact(ImpactFeedbackStyle.Medium);

    // Create destination and navigate
    const destination = {
      id: recommendation.place.placeId || `place-${Date.now()}`,
      title: recommendation.place.name,
      description: recommendation.reason,
      whatItIs: recommendation.place.name,
      whenToGo: 'Now',
      neighborhood: neighborhood || '',
      category: 'food' as const,
      whyNow: recommendation.reason,
      placeId: recommendation.place.placeId,
      address: recommendation.place.address || '',
      coordinates: recommendation.place.coordinates,
      priceLevel: recommendation.place.priceLevel || 2,
      transitPreview: {
        method: 'walk' as const,
        totalMinutes: parseInt(recommendation.walkTime) || 5,
        description: recommendation.walkTime,
      },
      spots: [],
      rating: recommendation.place.rating,
      isOpen: recommendation.isOpen,
    };

    viewDestination(destination);
    router.push('/navigation');
  }, [recommendation, viewDestination, router, neighborhood]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!recommendation?.place) return;

    safeHaptics.impact(ImpactFeedbackStyle.Light);

    if (!isSaved) {
      savePlace(recommendation.place);
      setIsSaved(true);
    }
  }, [recommendation, isSaved, savePlace]);

  // Handle text input submission
  const handleSubmit = useCallback(() => {
    if (!inputText.trim()) return;

    safeHaptics.impact(ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

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
        <View style={styles.content}>
          {/* Header - Location & Weather */}
          <View style={styles.header}>
            <View style={styles.locationRow}>
              <MapPin size={14} color={colors.text.secondary} />
              <Text style={styles.locationText}>
                {getGreeting()} in {neighborhood || 'Loading...'}
              </Text>
            </View>
            {displayTemperature && (
              <View style={styles.weatherRow}>
                {getWeatherIcon()}
                <Text style={styles.weatherText}>
                  {displayTemperature}°{temperatureUnit}
                  {weatherCondition ? ` · ${weatherCondition}` : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Smart Recommendation Card */}
          <View style={styles.recommendationSection}>
            {isLoading ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
                <Text style={styles.loadingText}>Finding the perfect spot...</Text>
              </View>
            ) : recommendation ? (
              <View style={styles.recommendationCard}>
                {/* Place name with emoji */}
                <Text style={styles.placeEmoji}>{getFoodEmoji()}</Text>
                <Text style={styles.placeName}>{recommendation.place.name}</Text>

                {/* Personalized reason */}
                <Text style={styles.placeReason}>{recommendation.reason}</Text>

                {/* Meta info */}
                <View style={styles.placeMeta}>
                  <Text style={styles.metaText}>{recommendation.walkTime}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  {recommendation.place.priceLevel && (
                    <>
                      <Text style={styles.metaText}>
                        {'$'.repeat(recommendation.place.priceLevel)}
                      </Text>
                      <Text style={styles.metaDot}>·</Text>
                    </>
                  )}
                  <Text style={[
                    styles.metaText,
                    { color: recommendation.isOpen ? colors.status.success : colors.status.error }
                  ]}>
                    {recommendation.isOpen ? 'Open now' : 'Closed'}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleTakeMeThere}
                    activeOpacity={0.8}
                  >
                    <Navigation size={18} color={colors.text.inverse} />
                    <Text style={styles.primaryButtonText}>Take me there</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryButton, isSaved && styles.savedButton]}
                    onPress={handleSave}
                    activeOpacity={0.8}
                  >
                    <Heart
                      size={20}
                      color={isSaved ? colors.status.error : colors.text.primary}
                      fill={isSaved ? colors.status.error : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : !isOnline ? (
              <View style={styles.offlineCard}>
                <Text style={styles.offlineEmoji}>📡</Text>
                <Text style={styles.offlineTitle}>You're offline</Text>
                <Text style={styles.offlineText}>
                  {savedPlaces.length > 0
                    ? `You have ${savedPlaces.length} saved places to explore`
                    : "Recommendations will appear when you're back online"}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Ask Tomo for recommendations
                </Text>
              </View>
            )}
          </View>

          {/* Spacer to push input to bottom */}
          <View style={styles.spacer} />

          {/* Input bar - at bottom */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask Tomo anything..."
              placeholderTextColor={colors.text.tertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              keyboardAppearance="dark"
            />
            <TouchableOpacity style={styles.inputButton} onPress={handleVoice}>
              <Mic size={22} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inputButton} onPress={handleCamera}>
              <Camera size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: typography.sizes.lg,
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

  // Recommendation
  recommendationSection: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing['2xl'],
  },
  recommendationCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  placeEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  placeName: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  placeReason: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  placeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  metaText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  metaDot: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginHorizontal: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.lg,
    borderRadius: borders.radius.lg,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.input,
    paddingHorizontal: spacing.lg,
    borderRadius: borders.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  savedButton: {
    backgroundColor: colors.status.errorMuted,
    borderColor: colors.status.error,
  },

  // Loading
  loadingCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.xl,
    padding: spacing['3xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  loadingText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginTop: spacing.lg,
  },

  // Offline
  offlineCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  offlineEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  offlineTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  offlineText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.text.tertiary,
  },

  // Spacer
  spacer: {
    flex: 1,
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
    marginBottom: spacing.xl,
  },
  textInput: {
    flex: 1,
    height: 52,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  inputButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
