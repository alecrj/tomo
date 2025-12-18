import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Navigation,
  Check,
  Trash2,
  Map,
  List,
  Star,
  Clock,
  Filter,
} from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { colors, spacing, borders, typography, shadows } from '../constants/theme';
import { useSavedPlacesStore, SavedPlace } from '../stores/useSavedPlacesStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import type { Destination } from '../types';

// Dark map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e0e' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
];

type ViewMode = 'list' | 'map';
type FilterOption = 'all' | 'nearby' | 'visited' | 'not_visited';

export default function SavedPlacesScreen() {
  const router = useRouter();

  // Stores
  const places = useSavedPlacesStore((state) => state.places);
  const removePlace = useSavedPlacesStore((state) => state.removePlace);
  const markVisited = useSavedPlacesStore((state) => state.markVisited);
  const getNearbyPlaces = useSavedPlacesStore((state) => state.getNearbyPlaces);
  const viewDestination = useNavigationStore((state) => state.viewDestination);
  const coordinates = useLocationStore((state) => state.coordinates);
  const neighborhood = useLocationStore((state) => state.neighborhood);

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<FilterOption>('all');

  // Filtered places
  const filteredPlaces = useMemo(() => {
    let result = places;

    switch (filter) {
      case 'nearby':
        if (coordinates) {
          result = getNearbyPlaces(coordinates, 5); // 5km radius
        }
        break;
      case 'visited':
        result = places.filter((p) => p.visited);
        break;
      case 'not_visited':
        result = places.filter((p) => !p.visited);
        break;
    }

    return result;
  }, [places, filter, coordinates, getNearbyPlaces]);

  // Map region based on places
  const mapRegion = useMemo(() => {
    if (filteredPlaces.length === 0 && coordinates) {
      return {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    if (filteredPlaces.length === 0) {
      return {
        latitude: 35.6762,
        longitude: 139.6503,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }

    // Calculate bounds
    const lats = filteredPlaces.map((p) => p.coordinates.latitude);
    const lons = filteredPlaces.map((p) => p.coordinates.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.02, (maxLon - minLon) * 1.5),
    };
  }, [filteredPlaces, coordinates]);

  const handleNavigateToPlace = (place: SavedPlace) => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);

    const destination: Destination = {
      id: place.placeId || `dest-${Date.now()}`,
      title: place.name,
      description: place.address,
      whatItIs: place.description || place.address,
      whenToGo: '',
      neighborhood: place.city || neighborhood || '',
      category: 'food',
      whyNow: '',
      address: place.address,
      coordinates: place.coordinates,
      priceLevel: place.priceLevel || 2,
      transitPreview: {
        method: 'walk',
        totalMinutes: parseInt(place.distance?.replace(/\D/g, '') || '10'),
        description: place.distance || '10 min walk',
      },
      spots: [],
    };

    viewDestination(destination);
    router.push('/navigation');
  };

  const handleMarkVisited = (place: SavedPlace) => {
    safeHaptics.notification(NotificationFeedbackType.Success);
    markVisited(place.placeId!);
  };

  const handleRemovePlace = (place: SavedPlace) => {
    Alert.alert(
      'Remove Saved Place',
      `Remove "${place.name}" from your saved places?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            safeHaptics.impact(ImpactFeedbackStyle.Medium);
            removePlace(place.placeId!);
          },
        },
      ]
    );
  };

  const renderPlaceCard = (place: SavedPlace) => (
    <View key={place.placeId} style={[styles.placeCard, place.visited && styles.placeCardVisited]}>
      <View style={styles.placeHeader}>
        {place.photo && (
          <Image source={{ uri: place.photo }} style={styles.placeImage} resizeMode="cover" />
        )}
        <View style={styles.placeInfo}>
          <Text style={[styles.placeName, place.visited && styles.placeNameVisited]} numberOfLines={2}>
            {place.name}
          </Text>
          {place.rating && (
            <View style={styles.ratingRow}>
              <Star size={12} color={colors.status.warning} fill={colors.status.warning} />
              <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
            </View>
          )}
          <View style={styles.addressRow}>
            <MapPin size={12} color={colors.text.tertiary} />
            <Text style={styles.addressText} numberOfLines={1}>
              {place.address}
            </Text>
          </View>
          {place.city && (
            <Text style={styles.cityText}>
              {place.city}{place.country ? `, ${place.country}` : ''}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.placeActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleNavigateToPlace(place)}
        >
          <Navigation size={16} color={colors.accent.primary} />
          <Text style={styles.actionButtonText}>Navigate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButtonIcon, place.visited && styles.actionButtonIconVisited]}
          onPress={() => handleMarkVisited(place)}
        >
          <Check size={18} color={place.visited ? colors.text.inverse : colors.status.success} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButtonIcon}
          onPress={() => handleRemovePlace(place)}
        >
          <Trash2 size={18} color={colors.status.error} />
        </TouchableOpacity>
      </View>

      {place.savedAt && (
        <View style={styles.savedAtRow}>
          <Clock size={10} color={colors.text.tertiary} />
          <Text style={styles.savedAtText}>
            Saved {formatTimeAgo(place.savedAt)}
          </Text>
        </View>
      )}
    </View>
  );

  // Empty state
  if (places.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Saved Places</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.emptyState}>
            <Heart size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Saved Places</Text>
            <Text style={styles.emptyDescription}>
              When you find a place you want to visit later,{'\n'}
              tap the heart icon to save it here!
            </Text>
            <TouchableOpacity style={styles.exploreButton} onPress={() => router.push('/')}>
              <Text style={styles.exploreButtonText}>Start Exploring</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Saved Places</Text>
            <Text style={styles.headerSubtitle}>
              {filteredPlaces.length} place{filteredPlaces.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <List size={20} color={viewMode === 'list' ? colors.accent.primary : colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'map' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('map')}
            >
              <Map size={20} color={viewMode === 'map' ? colors.accent.primary : colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          <FilterChip
            label="All"
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <FilterChip
            label="Nearby"
            active={filter === 'nearby'}
            onPress={() => setFilter('nearby')}
          />
          <FilterChip
            label="Visited"
            active={filter === 'visited'}
            onPress={() => setFilter('visited')}
          />
          <FilterChip
            label="Not Visited"
            active={filter === 'not_visited'}
            onPress={() => setFilter('not_visited')}
          />
        </ScrollView>

        {/* Content */}
        {viewMode === 'list' ? (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredPlaces.length === 0 ? (
              <View style={styles.noResultsState}>
                <Text style={styles.noResultsText}>No places match this filter</Text>
              </View>
            ) : (
              filteredPlaces.map(renderPlaceCard)
            )}
          </ScrollView>
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={mapRegion}
              customMapStyle={darkMapStyle}
              showsUserLocation
              showsMyLocationButton
            >
              {filteredPlaces.map((place) => (
                <Marker
                  key={place.placeId}
                  coordinate={place.coordinates}
                  title={place.name}
                  description={place.address}
                  onCalloutPress={() => handleNavigateToPlace(place)}
                >
                  <View style={[styles.marker, place.visited && styles.markerVisited]}>
                    <Heart
                      size={16}
                      color={place.visited ? colors.text.inverse : colors.status.error}
                      fill={place.visited ? colors.text.inverse : colors.status.error}
                    />
                  </View>
                </Marker>
              ))}
            </MapView>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// Filter chip component
function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={() => {
        safeHaptics.selection();
        onPress();
      }}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Helper to format time ago
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return new Date(timestamp).toLocaleDateString();
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  viewModeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borders.radius.md,
  },
  viewModeButtonActive: {
    backgroundColor: colors.accent.muted,
  },
  // Filter
  filterContainer: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  filterContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    backgroundColor: colors.background.secondary,
  },
  filterChipActive: {
    backgroundColor: colors.accent.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  // List view
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  placeCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  placeCardVisited: {
    opacity: 0.7,
    backgroundColor: colors.background.tertiary,
  },
  placeHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  placeImage: {
    width: 72,
    height: 72,
    borderRadius: borders.radius.md,
    backgroundColor: colors.background.tertiary,
  },
  placeInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  placeName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  placeNameVisited: {
    textDecorationLine: 'line-through',
    color: colors.text.secondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  ratingText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addressText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  cityText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  placeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borders.radius.md,
    backgroundColor: colors.accent.muted,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.accent.primary,
  },
  actionButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: borders.radius.md,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonIconVisited: {
    backgroundColor: colors.status.success,
  },
  savedAtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  savedAtText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  // Map view
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.status.error,
    ...shadows.md,
  },
  markerVisited: {
    backgroundColor: colors.status.success,
    borderColor: colors.status.success,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyDescription: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  exploreButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borders.radius.full,
  },
  exploreButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
  noResultsState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  noResultsText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
});
