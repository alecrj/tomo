import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
  TextInput,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { safeHaptics, ImpactFeedbackStyle } from '../../utils/haptics';
import {
  MapPin,
  Coffee,
  Utensils,
  Landmark,
  ShoppingBag,
  TreePine,
  Beer,
  Navigation,
  X,
  Star,
  Search,
  Send,
  MessageCircle,
  LocateFixed,
  Clock,
  SlidersHorizontal,
} from 'lucide-react-native';
import { colors, spacing, typography, borders, shadows } from '../../constants/theme';
import { useLocationStore } from '../../stores/useLocationStore';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { searchNearby, buildPhotoUrl, searchPlace } from '../../services/places';
import { chat } from '../../services/openai';
import { detectCurrency } from '../../utils/currency';
import { useWeatherStore } from '../../stores/useWeatherStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { useTripStore } from '../../stores/useTripStore';
import { useTimeOfDay } from '../../hooks/useTimeOfDay';
import type { Coordinates, Destination, DestinationContext } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Use Apple Maps for tiles, Google APIs for data
const MAP_PROVIDER = PROVIDER_DEFAULT;

// Tab bar height estimate
const TAB_BAR_HEIGHT = 85;

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
  photo?: string;
}

const CATEGORIES = [
  { id: 'restaurant', label: 'Food', icon: Utensils, type: 'restaurant' },
  { id: 'cafe', label: 'Coffee', icon: Coffee, type: 'cafe' },
  { id: 'bar', label: 'Drinks', icon: Beer, type: 'bar' },
  { id: 'tourist_attraction', label: 'Sights', icon: Landmark, type: 'tourist_attraction' },
  { id: 'shopping_mall', label: 'Shopping', icon: ShoppingBag, type: 'shopping_mall' },
  { id: 'park', label: 'Nature', icon: TreePine, type: 'park' },
];

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const viewDestination = useNavigationStore((state) => state.viewDestination);
  const timeOfDay = useTimeOfDay();

  // Weather and budget for chat context
  const weatherCondition = useWeatherStore((state) => state.condition);
  const weatherTemperature = useWeatherStore((state) => state.temperature);
  const budgetStore = useBudgetStore();
  const dailyBudget = budgetStore.dailyBudget;
  const budgetRemaining = budgetStore.remainingToday();
  const preferences = usePreferencesStore();
  const visits = useTripStore((state) => state.visits);
  const totalWalkingMinutes = useTripStore((state) => state.totalWalkingMinutes);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [allPlaces, setAllPlaces] = useState<PlaceResult[]>([]); // Unfiltered
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  // Filter states
  const [openNowFilter, setOpenNowFilter] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatResponse, setChatResponse] = useState<string | null>(null);

  const currency = coordinates ? detectCurrency(coordinates) : { symbol: '$' };

  const initialRegion: Region | undefined = coordinates ? {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  } : undefined;

  // Apply filters to places
  const applyFilters = useCallback((placesToFilter: PlaceResult[]) => {
    let filtered = [...placesToFilter];

    if (openNowFilter) {
      filtered = filtered.filter(p => p.isOpen === true);
    }

    return filtered;
  }, [openNowFilter]);

  // Toggle open now filter
  const toggleOpenNowFilter = useCallback(() => {
    safeHaptics.selection();
    setOpenNowFilter(prev => {
      const newValue = !prev;
      // Re-apply filter
      if (newValue) {
        setPlaces(allPlaces.filter(p => p.isOpen === true));
      } else {
        setPlaces(allPlaces);
      }
      return newValue;
    });
  }, [allPlaces]);

  // Re-center map on user location
  const handleRecenter = useCallback(() => {
    if (!coordinates || !mapRef.current) return;
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    mapRef.current.animateToRegion({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }, 300);
  }, [coordinates]);

  const handleCategoryPress = useCallback(async (categoryId: string, categoryType: string) => {
    if (!coordinates) return;

    safeHaptics.selection();

    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setPlaces([]);
      setAllPlaces([]);
      setSelectedPlace(null);
      return;
    }

    setSelectedCategory(categoryId);
    setSelectedPlace(null);
    setIsLoading(true);

    try {
      const results = await searchNearby(coordinates, '', categoryType, 2000);

      const mappedPlaces: PlaceResult[] = results.map((place) => ({
        id: place.id,
        name: place.displayName.text,
        address: place.formattedAddress,
        coordinates: {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
        },
        rating: place.rating,
        priceLevel: place.priceLevel ? getPriceLevelNumber(place.priceLevel) : undefined,
        isOpen: place.regularOpeningHours?.openNow,
        photo: place.photos?.[0]?.name ? buildPhotoUrl(place.photos[0].name, 400) : undefined,
      }));

      setAllPlaces(mappedPlaces);
      setPlaces(applyFilters(mappedPlaces));

      if (mappedPlaces.length > 0 && mapRef.current) {
        const allCoords = [coordinates, ...mappedPlaces.map(p => p.coordinates)];
        mapRef.current.fitToCoordinates(allCoords, {
          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('[Map] Error searching places:', error);
    } finally {
      setIsLoading(false);
    }
  }, [coordinates, selectedCategory, applyFilters]);

  const handleMarkerPress = useCallback((place: PlaceResult) => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    setSelectedPlace(place);

    mapRef.current?.animateToRegion({
      latitude: place.coordinates.latitude,
      longitude: place.coordinates.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }, 300);
  }, []);

  const handleNavigateToPlace = useCallback(() => {
    if (!selectedPlace) return;

    safeHaptics.impact(ImpactFeedbackStyle.Heavy);

    const destination: Destination = {
      id: selectedPlace.id,
      title: selectedPlace.name,
      description: selectedPlace.address,
      whatItIs: selectedPlace.address,
      whenToGo: '',
      neighborhood: neighborhood || '',
      category: 'food' as const,
      whyNow: '',
      address: selectedPlace.address,
      coordinates: selectedPlace.coordinates,
      priceLevel: (selectedPlace.priceLevel || 2) as 1 | 2 | 3 | 4,
      transitPreview: {
        method: 'walk',
        totalMinutes: 10,
        description: 'Walk',
      },
      spots: [],
    };

    viewDestination(destination);
    router.push('/navigation');
  }, [selectedPlace, neighborhood, viewDestination, router]);

  const getPriceLevelNumber = (priceLevel: string): number => {
    switch (priceLevel) {
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
        return 2;
    }
  };

  // Handle search for places
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !coordinates) return;

    safeHaptics.impact(ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setIsSearching(true);
    setSelectedCategory(null);
    setSelectedPlace(null);

    try {
      const result = await searchPlace(searchQuery, coordinates);

      if (result) {
        const mappedPlace: PlaceResult = {
          id: result.id,
          name: result.displayName.text,
          address: result.formattedAddress,
          coordinates: {
            latitude: result.location.latitude,
            longitude: result.location.longitude,
          },
          rating: result.rating,
          priceLevel: result.priceLevel ? getPriceLevelNumber(result.priceLevel) : undefined,
          isOpen: result.regularOpeningHours?.openNow,
          photo: result.photos?.[0]?.name ? buildPhotoUrl(result.photos[0].name, 400) : undefined,
        };

        setAllPlaces([mappedPlace]);
        setPlaces([mappedPlace]);
        setSelectedPlace(mappedPlace);

        mapRef.current?.animateToRegion({
          latitude: mappedPlace.coordinates.latitude,
          longitude: mappedPlace.coordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      } else {
        setPlaces([]);
        setAllPlaces([]);
        setChatResponse('No places found for "' + searchQuery + '". Try a different search.');
      }
    } catch (error) {
      console.error('[Map] Search error:', error);
      setChatResponse('Error searching for places. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, coordinates]);

  // Handle chat with Tomo about this area
  const handleChatSubmit = useCallback(async () => {
    if (!chatInput.trim() || !coordinates) return;

    safeHaptics.impact(ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setIsChatting(true);
    setChatResponse(null);

    try {
      const context: DestinationContext = {
        location: coordinates,
        neighborhood: neighborhood || 'unknown location',
        timeOfDay,
        weather: weatherCondition && weatherTemperature ? {
          condition: weatherCondition,
          temperature: weatherTemperature,
          description: `${weatherCondition}, ${weatherTemperature}°C`,
          humidity: 0,
        } : null,
        budgetRemaining,
        dailyBudget,
        preferences: {
          homeBase: preferences.homeBase,
          walkingTolerance: preferences.walkingTolerance === 'medium' ? 'moderate' : preferences.walkingTolerance,
          budget: preferences.budgetLevel,
          dietary: preferences.dietary,
          interests: preferences.interests,
          avoidCrowds: preferences.avoidCrowds,
        },
        visitedPlaces: visits.slice(-10),
        completedStamps: [],
        excludedToday: [],
        totalWalkingToday: totalWalkingMinutes,
      };

      const response = await chat(chatInput, context, []);

      setChatResponse(response.content);

      // If the response includes a place, show it on the map
      if (response.placeCard && response.placeCard.coordinates) {
        const mappedPlace: PlaceResult = {
          id: `chat-${Date.now()}`,
          name: response.placeCard.name,
          address: response.placeCard.address,
          coordinates: response.placeCard.coordinates,
          rating: response.placeCard.rating,
          priceLevel: response.placeCard.priceLevel,
          isOpen: response.placeCard.openNow,
          photo: response.placeCard.photo,
        };

        setAllPlaces([mappedPlace]);
        setPlaces([mappedPlace]);
        setSelectedPlace(mappedPlace);

        mapRef.current?.animateToRegion({
          latitude: mappedPlace.coordinates.latitude,
          longitude: mappedPlace.coordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      }

      setChatInput('');
    } catch (error) {
      console.error('[Map] Chat error:', error);
      setChatResponse('Sorry, I had trouble responding. Please try again.');
    } finally {
      setIsChatting(false);
    }
  }, [chatInput, coordinates, neighborhood, timeOfDay, weatherCondition, weatherTemperature, budgetRemaining, dailyBudget, preferences, visits, totalWalkingMinutes]);

  const renderPriceLevel = (level?: number) => {
    if (!level) return null;
    return currency.symbol.repeat(level);
  };

  if (!coordinates) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.content}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Apple Maps with dark mode */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        userInterfaceStyle="dark"
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        // Move Apple Maps attribution to bottom right, above tab bar
        legalLabelInsets={{ bottom: TAB_BAR_HEIGHT + 60, right: 10, top: 0, left: 0 }}
      >
        {/* Place markers with rating badges */}
        {places.map((place) => (
          <Marker
            key={place.id}
            coordinate={place.coordinates}
            onPress={() => handleMarkerPress(place)}
          >
            <View style={[
              styles.markerContainer,
              selectedPlace?.id === place.id && styles.markerSelected,
              place.isOpen === false && styles.markerClosed,
            ]}>
              {place.rating ? (
                <View style={styles.markerRating}>
                  <Star size={10} color="#FFF" fill="#FFF" />
                  <Text style={styles.markerRatingText}>{place.rating.toFixed(1)}</Text>
                </View>
              ) : (
                <MapPin
                  size={16}
                  color={selectedPlace?.id === place.id ? colors.text.inverse : colors.text.primary}
                />
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Explore</Text>
            <Text style={styles.headerSubtitle}>{neighborhood || 'Nearby'}</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={18} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search places..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              keyboardAppearance="dark"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setPlaces([]);
                  setAllPlaces([]);
                  setSelectedPlace(null);
                }}
              >
                <X size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
          {isSearching && (
            <ActivityIndicator size="small" color={colors.accent.primary} style={styles.searchSpinner} />
          )}
        </View>

        {/* Category pills + filters */}
        <View style={styles.filtersRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {/* Open Now filter */}
            <TouchableOpacity
              style={[styles.filterPill, openNowFilter && styles.filterPillActive]}
              onPress={toggleOpenNowFilter}
            >
              <Clock size={14} color={openNowFilter ? colors.text.inverse : colors.status.success} />
              <Text style={[styles.filterText, openNowFilter && styles.filterTextActive]}>
                Open Now
              </Text>
            </TouchableOpacity>

            {/* Category pills */}
            {CATEGORIES.map((category) => {
              const IconComponent = category.icon;
              const isSelected = selectedCategory === category.id;

              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => handleCategoryPress(category.id, category.type)}
                >
                  <IconComponent
                    size={16}
                    color={isSelected ? colors.text.inverse : colors.accent.primary}
                  />
                  <Text style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextSelected,
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {isLoading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={colors.accent.primary} />
            <Text style={styles.loadingIndicatorText}>Searching...</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Re-center button */}
      <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter}>
        <LocateFixed size={20} color={colors.text.primary} />
      </TouchableOpacity>

      {/* Results count badge */}
      {places.length > 0 && !selectedPlace && (
        <View style={styles.resultsCountBadge}>
          <Text style={styles.resultsCountText}>
            {places.length} place{places.length !== 1 ? 's' : ''} found
            {openNowFilter ? ' (open now)' : ''}
          </Text>
        </View>
      )}

      {/* Selected place card */}
      {selectedPlace && (
        <View style={styles.placeCardContainer}>
          <View style={styles.placeCard}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                safeHaptics.impact(ImpactFeedbackStyle.Light);
                setSelectedPlace(null);
              }}
            >
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={styles.placeCardContent}>
              {selectedPlace.photo && (
                <Image
                  source={{ uri: selectedPlace.photo }}
                  style={styles.placePhoto}
                  resizeMode="cover"
                />
              )}

              <View style={styles.placeInfo}>
                <Text style={styles.placeName} numberOfLines={2}>
                  {selectedPlace.name}
                </Text>

                <View style={styles.placeDetails}>
                  {selectedPlace.rating && (
                    <View style={styles.ratingContainer}>
                      <Star size={14} color={colors.status.warning} fill={colors.status.warning} />
                      <Text style={styles.ratingText}>{selectedPlace.rating.toFixed(1)}</Text>
                    </View>
                  )}
                  {selectedPlace.priceLevel && (
                    <Text style={styles.priceText}>
                      {renderPriceLevel(selectedPlace.priceLevel)}
                    </Text>
                  )}
                  {selectedPlace.isOpen !== undefined && (
                    <Text style={[
                      styles.openStatus,
                      selectedPlace.isOpen ? styles.openNow : styles.closedNow,
                    ]}>
                      {selectedPlace.isOpen ? 'Open' : 'Closed'}
                    </Text>
                  )}
                </View>

                <Text style={styles.placeAddress} numberOfLines={2}>
                  {selectedPlace.address}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.navigateButton}
              onPress={handleNavigateToPlace}
            >
              <Navigation size={18} color={colors.text.inverse} />
              <Text style={styles.navigateButtonText}>Take me there</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Empty state */}
      {!selectedCategory && !isLoading && !selectedPlace && !chatResponse && places.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyState}>
            <MapPin size={24} color={colors.text.secondary} />
            <Text style={styles.emptyStateText}>
              Search or tap a category to explore
            </Text>
          </View>
        </View>
      )}

      {/* Chat response bubble */}
      {chatResponse && !selectedPlace && (
        <View style={styles.chatResponseContainer}>
          <View style={styles.chatResponseBubble}>
            <TouchableOpacity
              style={styles.chatResponseClose}
              onPress={() => setChatResponse(null)}
            >
              <X size={16} color={colors.text.secondary} />
            </TouchableOpacity>
            <View style={styles.chatResponseHeader}>
              <MessageCircle size={16} color={colors.accent.primary} />
              <Text style={styles.chatResponseLabel}>Tomo</Text>
            </View>
            <Text style={styles.chatResponseText}>{chatResponse}</Text>
          </View>
        </View>
      )}

      {/* Chat input bar - positioned above tab bar */}
      <View style={styles.chatInputContainer}>
        <View style={styles.chatInputWrapper}>
          <TextInput
            style={styles.chatInput}
            placeholder="Ask about this area..."
            placeholderTextColor={colors.text.tertiary}
            value={chatInput}
            onChangeText={setChatInput}
            onSubmitEditing={handleChatSubmit}
            returnKeyType="send"
            keyboardAppearance="dark"
            multiline={false}
          />
          {chatInput.trim() ? (
            <TouchableOpacity
              style={styles.chatSendButton}
              onPress={handleChatSubmit}
              disabled={isChatting}
            >
              {isChatting ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Send size={16} color={colors.text.inverse} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.chatSendButtonDisabled}>
              <Send size={16} color={colors.text.tertiary} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borders.radius.lg,
    ...shadows.md,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  filtersRow: {
    marginTop: spacing.xs,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    marginRight: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.status.success,
    ...shadows.sm,
  },
  filterPillActive: {
    backgroundColor: colors.status.success,
    borderColor: colors.status.success,
  },
  filterText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.status.success,
  },
  filterTextActive: {
    color: colors.text.inverse,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    marginRight: spacing.sm,
    gap: spacing.xs,
    ...shadows.sm,
  },
  categoryPillSelected: {
    backgroundColor: colors.accent.primary,
  },
  categoryText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.accent.primary,
  },
  categoryTextSelected: {
    color: colors.text.inverse,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    marginHorizontal: spacing.md,
    alignSelf: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  loadingIndicatorText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  markerContainer: {
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.full,
    padding: 6,
    borderWidth: 2,
    borderColor: '#FFF',
    ...shadows.md,
  },
  markerSelected: {
    backgroundColor: colors.accent.secondary,
    transform: [{ scale: 1.2 }],
  },
  markerClosed: {
    backgroundColor: colors.text.tertiary,
    opacity: 0.7,
  },
  markerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  markerRatingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  recenterButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: TAB_BAR_HEIGHT + 80,
    width: 44,
    height: 44,
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  resultsCountBadge: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + 80,
    left: spacing.md,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    ...shadows.sm,
  },
  resultsCountText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  placeCardContainer: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + 70,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
  },
  placeCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borders.radius.full,
    zIndex: 1,
  },
  placeCardContent: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  placePhoto: {
    width: 80,
    height: 80,
    borderRadius: borders.radius.md,
    backgroundColor: colors.background.tertiary,
  },
  placeInfo: {
    flex: 1,
    marginLeft: spacing.md,
    paddingRight: spacing.xl,
  },
  placeName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  placeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  priceText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  openStatus: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  openNow: {
    color: colors.status.success,
  },
  closedNow: {
    color: colors.status.error,
  },
  placeAddress: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.lg,
    borderRadius: borders.radius.md,
    gap: spacing.sm,
  },
  navigateButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
  emptyStateContainer: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borders.radius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  emptyStateText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    maxWidth: 200,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  searchSpinner: {
    marginLeft: spacing.sm,
  },
  chatInputContainer: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.input,
    borderRadius: borders.radius.xl,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chatInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  chatSendButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonDisabled: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatResponseContainer: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + 70,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
  },
  chatResponseBubble: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  chatResponseClose: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borders.radius.full,
    zIndex: 1,
  },
  chatResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chatResponseLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.accent.primary,
  },
  chatResponseText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 22,
    paddingRight: spacing.lg,
  },
});
