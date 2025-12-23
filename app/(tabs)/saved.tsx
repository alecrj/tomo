import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Map,
  Bookmark,
  MapPin,
  Navigation,
  Trash2,
  Check,
  Star,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { colors, spacing, typography, borders, shadows } from '../../constants/theme';
import { useSavedPlacesStore } from '../../stores/useSavedPlacesStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

export default function SavedScreen() {
  const router = useRouter();

  // Store state
  const places = useSavedPlacesStore((state) => state.places);
  const removePlace = useSavedPlacesStore((state) => state.removePlace);
  const markVisited = useSavedPlacesStore((state) => state.markVisited);
  const coordinates = useLocationStore((state) => state.coordinates);

  // Local state
  const [showVisited, setShowVisited] = useState(true);

  // Sort places by distance (nearest first), then by whether visited
  const sortedPlaces = useMemo(() => {
    return [...places].sort((a, b) => {
      // Unvisited first
      if (a.visited !== b.visited) {
        return a.visited ? 1 : -1;
      }
      // Then by distance
      if (coordinates && a.coordinates && b.coordinates) {
        const distA = getDistanceValue(coordinates, a.coordinates);
        const distB = getDistanceValue(coordinates, b.coordinates);
        return distA - distB;
      }
      return 0;
    });
  }, [places, coordinates]);

  // Filter out visited if toggle is off
  const filteredPlaces = useMemo(() => {
    if (showVisited) return sortedPlaces;
    return sortedPlaces.filter(p => !p.visited);
  }, [sortedPlaces, showVisited]);

  // Stats
  const visitedCount = places.filter(p => p.visited).length;
  const unvisitedCount = places.length - visitedCount;

  // Calculate distance value in km
  function getDistanceValue(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
    const R = 6371;
    const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.latitude * Math.PI) / 180) *
        Math.cos((to.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Format distance for display
  const formatDistance = (placeCoords?: { latitude: number; longitude: number }) => {
    if (!coordinates || !placeCoords) return null;
    const distance = getDistanceValue(coordinates, placeCoords);
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  // Handle navigation
  const handleNavigate = useCallback((place: typeof places[0]) => {
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
  }, [router]);

  // Handle mark visited
  const handleMarkVisited = useCallback((placeId: string, currentlyVisited: boolean) => {
    safeHaptics.notification(NotificationFeedbackType.Success);
    markVisited(placeId);
  }, [markVisited]);

  // Handle delete with confirmation
  const handleDelete = useCallback((placeId: string, placeName: string) => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove Place',
      `Remove "${placeName}" from saved places?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removePlace(placeId)
        },
      ]
    );
  }, [removePlace]);

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
          <View>
            <Text style={styles.headerTitle}>Saved Places</Text>
            {!isEmpty && (
              <Text style={styles.headerSubtitle}>
                {unvisitedCount} to visit{visitedCount > 0 ? ` · ${visitedCount} visited` : ''}
              </Text>
            )}
          </View>
          {!isEmpty && (
            <TouchableOpacity style={styles.mapButton} onPress={handleMapView}>
              <Map size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          )}
        </View>

        {isEmpty ? (
          /* Empty state */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Bookmark size={32} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No saved places yet</Text>
            <Text style={styles.emptySubtitle}>
              When you find places you love, save them here for easy access
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/map')}
            >
              <Map size={18} color={colors.text.inverse} />
              <Text style={styles.exploreButtonText}>Explore Map</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Toggle visited */}
            {visitedCount > 0 && (
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => {
                    safeHaptics.impact(ImpactFeedbackStyle.Light);
                    setShowVisited(!showVisited);
                  }}
                >
                  <View style={[styles.toggleCheck, showVisited && styles.toggleCheckActive]}>
                    {showVisited && <Check size={12} color={colors.text.inverse} />}
                  </View>
                  <Text style={styles.toggleText}>Show visited places</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Places list */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredPlaces.map((place, index) => (
                <TouchableOpacity
                  key={place.placeId || place.name}
                  style={[
                    styles.placeCard,
                    place.visited && styles.placeCardVisited,
                  ]}
                  onPress={() => handleNavigate(place)}
                  onLongPress={() => place.placeId && handleDelete(place.placeId, place.name)}
                  activeOpacity={0.7}
                >
                  {/* Image */}
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

                  {/* Content */}
                  <View style={styles.placeContent}>
                    <View style={styles.placeHeader}>
                      <Text style={styles.placeName} numberOfLines={1}>
                        {place.name}
                      </Text>
                      {place.visited && (
                        <View style={styles.visitedBadge}>
                          <Check size={10} color={colors.status.success} />
                        </View>
                      )}
                    </View>

                    <View style={styles.placeMeta}>
                      {place.rating && (
                        <View style={styles.ratingContainer}>
                          <Star size={12} color="#FFB800" fill="#FFB800" />
                          <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
                        </View>
                      )}
                      {place.priceLevel && (
                        <Text style={styles.priceText}>
                          {'$'.repeat(place.priceLevel)}
                        </Text>
                      )}
                      {formatDistance(place.coordinates) && (
                        <Text style={styles.distanceText}>
                          {formatDistance(place.coordinates)}
                        </Text>
                      )}
                    </View>

                    {place.address && (
                      <Text style={styles.addressText} numberOfLines={1}>
                        {place.address}
                      </Text>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.placeActions}>
                    <TouchableOpacity
                      style={styles.visitedButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        place.placeId && handleMarkVisited(place.placeId, !!place.visited);
                      }}
                    >
                      <Check
                        size={16}
                        color={place.visited ? colors.status.success : colors.text.tertiary}
                      />
                    </TouchableOpacity>
                    <View style={styles.navigateButton}>
                      <Navigation size={16} color={colors.accent.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Tip */}
              <View style={styles.tipContainer}>
                <Text style={styles.tipText}>
                  Long press any place to remove it
                </Text>
              </View>

              <View style={{ height: 100 }} />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },

  // Toggle
  toggleContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleCheck: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCheckActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },

  // List
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  // Place card
  placeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  placeCardVisited: {
    opacity: 0.6,
  },
  placeImage: {
    width: 72,
    height: 72,
    borderRadius: borders.radius.lg,
  },
  placePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: borders.radius.lg,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeName: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  visitedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.status.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  priceText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  distanceText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  addressText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },

  // Actions
  placeActions: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  visitedButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tip
  tipContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  tipText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.full,
    ...shadows.md,
  },
  exploreButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
});
