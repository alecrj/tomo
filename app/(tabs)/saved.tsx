import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Map,
  Heart,
  MapPin,
  Navigation,
  Trash2,
  CheckCircle,
  Utensils,
  Coffee,
  Landmark,
  ShoppingBag,
} from 'lucide-react-native';
import { colors, spacing, typography, borders } from '../../constants/theme';
import { useSavedPlacesStore } from '../../stores/useSavedPlacesStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../../utils/haptics';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'attraction', label: 'See' },
  { id: 'shop', label: 'Shop' },
];

export default function SavedScreen() {
  const router = useRouter();

  // Store state
  const places = useSavedPlacesStore((state) => state.places);
  const removePlace = useSavedPlacesStore((state) => state.removePlace);
  const markVisited = useSavedPlacesStore((state) => state.markVisited);
  const coordinates = useLocationStore((state) => state.coordinates);

  // Local state
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Group places by city
  const placesByCity = useMemo(() => {
    const grouped: Record<string, typeof places> = {};

    places.forEach((place) => {
      const city = place.city || 'Saved';
      if (!grouped[city]) {
        grouped[city] = [];
      }
      grouped[city].push(place);
    });

    // Filter by category if needed
    if (selectedFilter !== 'all') {
      Object.keys(grouped).forEach((city) => {
        grouped[city] = grouped[city].filter((p) => {
          const name = p.name.toLowerCase();
          switch (selectedFilter) {
            case 'food':
              return name.includes('restaurant') || name.includes('cafe') || name.includes('bar');
            case 'attraction':
              return name.includes('museum') || name.includes('temple') || name.includes('park');
            case 'shop':
              return name.includes('shop') || name.includes('market') || name.includes('mall');
            default:
              return true;
          }
        });
      });
    }

    return grouped;
  }, [places, selectedFilter]);

  // Calculate distance to place
  const getDistance = (placeCoords?: { latitude: number; longitude: number }) => {
    if (!coordinates || !placeCoords) return null;

    const R = 6371; // Earth's radius in km
    const dLat = ((placeCoords.latitude - coordinates.latitude) * Math.PI) / 180;
    const dLon = ((placeCoords.longitude - coordinates.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coordinates.latitude * Math.PI) / 180) *
        Math.cos((placeCoords.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  // Handle navigation
  const handleNavigate = (place: typeof places[0]) => {
    if (!place.coordinates) return;
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/navigation',
      params: {
        name: place.name,
        address: place.address,
        lat: place.coordinates.latitude,
        lng: place.coordinates.longitude,
      },
    });
  };

  // Handle mark visited
  const handleMarkVisited = (placeId: string) => {
    safeHaptics.notification(NotificationFeedbackType.Success);
    markVisited(placeId);
  };

  // Handle delete
  const handleDelete = (placeId: string) => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    removePlace(placeId);
  };

  // Open map view
  const handleMapView = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/map',
      params: { filter: 'saved' },
    });
  };

  const isEmpty = places.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Saved</Text>
          {!isEmpty && (
            <TouchableOpacity style={styles.mapButton} onPress={handleMapView}>
              <Map size={20} color={colors.accent.primary} />
              <Text style={styles.mapButtonText}>Map View</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEmpty ? (
          /* Empty state */
          <View style={styles.emptyState}>
            <Heart size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No saved places</Text>
            <Text style={styles.emptySubtitle}>
              Save places from chat or the map to find them here
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/map')}
            >
              <Text style={styles.exploreButtonText}>Explore the map</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersContainer}
              contentContainerStyle={styles.filtersContent}
            >
              {FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    selectedFilter === filter.id && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    safeHaptics.impact(ImpactFeedbackStyle.Light);
                    setSelectedFilter(filter.id);
                  }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedFilter === filter.id && styles.filterTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Places list */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {Object.entries(placesByCity).map(([city, cityPlaces]) => (
                <View key={city}>
                  {cityPlaces.length > 0 && (
                    <>
                      <Text style={styles.cityTitle}>{city}</Text>
                      {cityPlaces.map((place) => (
                        <View
                          key={place.placeId || place.name}
                          style={[
                            styles.placeCard,
                            place.visited && styles.placeCardVisited,
                          ]}
                        >
                          {place.photo ? (
                            <Image
                              source={{ uri: place.photo }}
                              style={styles.placeImage}
                            />
                          ) : (
                            <View style={styles.placePlaceholder}>
                              <MapPin size={24} color={colors.text.tertiary} />
                            </View>
                          )}
                          <View style={styles.placeContent}>
                            <Text style={styles.placeName} numberOfLines={1}>
                              {place.name}
                            </Text>
                            <View style={styles.placeMeta}>
                              {place.rating && (
                                <Text style={styles.placeRating}>
                                  {place.rating.toFixed(1)}
                                </Text>
                              )}
                              {place.priceLevel && (
                                <Text style={styles.placePrice}>
                                  {'$'.repeat(place.priceLevel)}
                                </Text>
                              )}
                              {getDistance(place.coordinates) && (
                                <Text style={styles.placeDistance}>
                                  {getDistance(place.coordinates)}
                                </Text>
                              )}
                            </View>
                            {place.visited && (
                              <View style={styles.visitedBadge}>
                                <CheckCircle size={12} color={colors.status.success} />
                                <Text style={styles.visitedText}>Visited</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.placeActions}>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => place.placeId && handleMarkVisited(place.placeId)}
                            >
                              <CheckCircle
                                size={18}
                                color={place.visited ? colors.status.success : colors.text.tertiary}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => handleNavigate(place)}
                            >
                              <Navigation size={18} color={colors.accent.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => place.placeId && handleDelete(place.placeId)}
                            >
                              <Trash2 size={18} color={colors.status.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              ))}

              <View style={{ height: 120 }} />
            </ScrollView>
          </>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mapButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.accent.primary,
    fontWeight: typography.weights.semibold,
  },

  // Filters
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filterChipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  filterText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  filterTextActive: {
    color: colors.text.inverse,
  },

  // List
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  cityTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },

  // Place card
  placeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  placeCardVisited: {
    opacity: 0.7,
  },
  placeImage: {
    width: 60,
    height: 60,
    borderRadius: borders.radius.md,
    marginRight: spacing.md,
  },
  placePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: borders.radius.md,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  placeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  placeName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  placeMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  placeRating: {
    fontSize: typography.sizes.sm,
    color: colors.status.warning,
    fontWeight: typography.weights.medium,
  },
  placePrice: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  placeDistance: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  visitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  visitedText: {
    fontSize: typography.sizes.xs,
    color: colors.status.success,
  },
  placeActions: {
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  exploreButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.lg,
  },
  exploreButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
});
