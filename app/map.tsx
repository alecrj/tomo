import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import {
  ArrowLeft,
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
} from 'lucide-react-native';
import { colors, spacing, typography } from '../constants/theme';
import { useLocationStore } from '../stores/useLocationStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { searchNearby, buildPhotoUrl } from '../services/places';
import { detectCurrency } from '../utils/currency';
import type { Coordinates, Destination } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function MapExploreScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const viewDestination = useNavigationStore((state) => state.viewDestination);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  const currency = coordinates ? detectCurrency(coordinates) : { symbol: '$' };

  const initialRegion: Region | undefined = coordinates ? {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  } : undefined;

  const handleCategoryPress = useCallback(async (categoryId: string, categoryType: string) => {
    if (!coordinates) return;

    if (selectedCategory === categoryId) {
      // Deselect
      setSelectedCategory(null);
      setPlaces([]);
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

      setPlaces(mappedPlaces);

      // Fit map to show all places
      if (mappedPlaces.length > 0 && mapRef.current) {
        const allCoords = [coordinates, ...mappedPlaces.map(p => p.coordinates)];
        mapRef.current.fitToCoordinates(allCoords, {
          edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('[Map] Error searching places:', error);
    } finally {
      setIsLoading(false);
    }
  }, [coordinates, selectedCategory]);

  const handleMarkerPress = useCallback((place: PlaceResult) => {
    setSelectedPlace(place);

    // Center on the selected place
    mapRef.current?.animateToRegion({
      latitude: place.coordinates.latitude,
      longitude: place.coordinates.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }, 300);
  }, []);

  const handleNavigateToPlace = useCallback(() => {
    if (!selectedPlace) return;

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
  }, [selectedPlace, neighborhood, selectedCategory, viewDestination, router]);

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

  const renderPriceLevel = (level?: number) => {
    if (!level) return null;
    return currency.symbol.repeat(level);
  };

  if (!coordinates) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.content}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full screen map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Place markers */}
        {places.map((place) => (
          <Marker
            key={place.id}
            coordinate={place.coordinates}
            onPress={() => handleMarkerPress(place)}
          >
            <View style={[
              styles.markerContainer,
              selectedPlace?.id === place.id && styles.markerSelected,
            ]}>
              <MapPin
                size={20}
                color="#FFFFFF"
                fill={selectedPlace?.id === place.id ? '#007AFF' : '#FF3B30'}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.light.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Explore</Text>
            <Text style={styles.headerSubtitle}>{neighborhood || 'Nearby'}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Category pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
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
                  color={isSelected ? '#FFFFFF' : '#007AFF'}
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

        {isLoading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingIndicatorText}>Searching...</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Selected place card */}
      {selectedPlace && (
        <View style={styles.placeCardContainer}>
          <View style={styles.placeCard}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedPlace(null)}
            >
              <X size={20} color={colors.text.light.secondary} />
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
                      <Star size={14} color="#FFB800" fill="#FFB800" />
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
              <Navigation size={18} color="#FFFFFF" />
              <Text style={styles.navigateButtonText}>Take me there</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Empty state */}
      {!selectedCategory && !isLoading && (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyState}>
            <MapPin size={24} color={colors.text.light.secondary} />
            <Text style={styles.emptyStateText}>
              Select a category above to explore nearby places
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 24,
    marginRight: spacing.sm,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryPillSelected: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: '#007AFF',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginHorizontal: spacing.md,
    alignSelf: 'center',
    gap: spacing.sm,
  },
  loadingIndicatorText: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.base,
    color: colors.text.light.secondary,
  },
  markerContainer: {
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  markerSelected: {
    backgroundColor: '#007AFF',
    transform: [{ scale: 1.2 }],
  },
  placeCardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    zIndex: 1,
  },
  placeCardContent: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  placePhoto: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  placeInfo: {
    flex: 1,
    marginLeft: spacing.md,
    paddingRight: spacing.xl,
  },
  placeName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
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
    color: colors.text.light.primary,
  },
  priceText: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
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
    color: colors.text.light.secondary,
    lineHeight: 18,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: spacing.lg,
    borderRadius: 14,
    gap: spacing.sm,
  },
  navigateButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: '#FFFFFF',
  },
  emptyStateContainer: {
    position: 'absolute',
    bottom: spacing.xl * 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateText: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
    maxWidth: 200,
  },
});
