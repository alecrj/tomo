import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  ArrowLeft,
  Share2,
  Download,
  MapPin,
  Calendar,
  DollarSign,
  MessageCircle,
  Sparkles,
  Star,
  User,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { colors, spacing, borders, shadows, mapStyle } from '../constants/theme';
import { useTripStore } from '../stores/useTripStore';
import { useConversationStore } from '../stores/useConversationStore';
import { detectCurrency } from '../utils/currency';
import { generateTripSummary, TripSummaryResult } from '../services/openai';
import type { ChatMessage } from '../types';

// City colors for map pins
const CITY_COLORS = [
  colors.accent.primary,   // Teal
  colors.accent.secondary, // Blue
  colors.status.success,   // Green
  colors.status.warning,   // Orange
  colors.status.error,     // Red
  '#AF52DE',               // Purple
  '#FF2D55',               // Pink
  '#FFCC00',               // Yellow
];

const { width } = Dimensions.get('window');

export default function TripRecapScreen() {
  const mapRef = useRef<MapView>(null);
  const { currentTrip, pastTrips } = useTripStore();
  const conversationStore = useConversationStore();
  const [selectedTrip, setSelectedTrip] = useState(currentTrip);
  const [aiSummary, setAiSummary] = useState<TripSummaryResult | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    if (!selectedTrip) {
      if (currentTrip) {
        setSelectedTrip(currentTrip);
      } else if (pastTrips.length > 0) {
        setSelectedTrip(pastTrips[pastTrips.length - 1]);
      }
    }
  }, [currentTrip, pastTrips]);

  // Generate AI summary when trip is selected
  useEffect(() => {
    async function fetchSummary() {
      if (!selectedTrip || selectedTrip.cities.length === 0) {
        setAiSummary(null);
        return;
      }

      setIsLoadingSummary(true);
      try {
        // Get currency for the trip
        const firstVisit = selectedTrip.cities[0]?.visits[0];
        const currency = firstVisit
          ? detectCurrency(firstVisit.coordinates)
          : { code: 'USD', symbol: '$', name: 'US Dollar' };

        const summary = await generateTripSummary({
          name: selectedTrip.name,
          days: selectedTrip.stats.totalDays,
          cities: selectedTrip.cities.map((city) => ({
            name: city.name,
            country: city.country,
            visits: city.visits.map((v) => ({ name: v.name, neighborhood: v.neighborhood })),
            totalExpenses: city.totalExpenses,
          })),
          totalPlaces: selectedTrip.stats.totalPlaces,
          totalExpenses: selectedTrip.stats.totalExpenses,
          currency: currency.symbol,
        });

        setAiSummary(summary);
      } catch (error) {
        console.error('[TripRecap] Error generating summary:', error);
        setAiSummary(null);
      } finally {
        setIsLoadingSummary(false);
      }
    }

    fetchSummary();
  }, [selectedTrip?.id]);

  const getCityColor = (index: number) => CITY_COLORS[index % CITY_COLORS.length];

  // Get all visit coordinates for fitting the map
  const getAllVisits = () => {
    if (!selectedTrip) return [];
    return selectedTrip.cities.flatMap((city, cityIndex) =>
      city.visits.map(visit => ({
        ...visit,
        color: getCityColor(cityIndex),
        cityName: city.name,
      }))
    );
  };

  const allVisits = getAllVisits();

  // Fit map to show all markers
  useEffect(() => {
    if (mapRef.current && allVisits.length > 0) {
      const coordinates = allVisits.map(v => v.coordinates);
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [allVisits]);

  if (!selectedTrip) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Trip Recap</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.emptyState}>
            <MapPin size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>
              Start exploring and your trip will be tracked automatically
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const trip = selectedTrip;

  // Get currency for the first city
  const firstVisit = trip.cities[0]?.visits[0];
  const currency = firstVisit
    ? detectCurrency(firstVisit.coordinates)
    : { code: 'USD', symbol: '$', name: 'US Dollar' };

  // Format date range
  const startDate = new Date(trip.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const endDate = trip.endDate
    ? new Date(trip.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Present';

  const handleExportPDF = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    Alert.alert(
      'Export PDF',
      'PDF export is coming soon! For now, you can share your trip summary.',
      [{ text: 'OK' }]
    );
  };

  const handleShare = async () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    try {
      const placesCount = trip.stats.totalPlaces;
      const daysCount = trip.stats.totalDays;
      const citiesList = trip.cities.map(c => c.name).join(', ');
      const topPlaces = trip.cities
        .flatMap(c => c.visits)
        .slice(0, 3)
        .map(v => v.name)
        .join(', ');

      const message = `My ${trip.name}\n\n` +
        `${daysCount} days • ${placesCount} places\n` +
        `Cities: ${citiesList}\n` +
        `Highlights: ${topPlaces}\n\n` +
        `Tracked with Tomo - your AI travel companion`;

      await Share.share({
        message,
        title: trip.name,
      });
    } catch (error) {
      console.error('[TripRecap] Share error:', error);
    }
  };

  const handleSendToChat = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    const summaryMessage: ChatMessage = {
      id: `recap-${Date.now()}`,
      role: 'user',
      content: 'Show me a summary of my trip',
      timestamp: Date.now(),
    };
    conversationStore.addMessage(summaryMessage);
    router.push('/');
  };

  // Calculate initial region for map
  const getInitialRegion = () => {
    if (allVisits.length === 0) {
      return {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 50,
        longitudeDelta: 50,
      };
    }

    const lats = allVisits.map(v => v.coordinates.latitude);
    const lngs = allVisits.map(v => v.coordinates.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.5),
    };
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Recap</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Share2 size={22} color={colors.accent.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Trip Title */}
          <View style={styles.titleSection}>
            <Text style={styles.tripTitle}>{trip.name}</Text>
            <Text style={styles.tripDates}>
              {startDate} - {endDate}
            </Text>
            {trip.isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active Trip</Text>
              </View>
            )}
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Calendar size={24} color={colors.accent.secondary} />
              <Text style={styles.statValue}>{trip.stats.totalDays}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            <View style={styles.statCard}>
              <MapPin size={24} color={colors.status.success} />
              <Text style={styles.statValue}>{trip.stats.totalPlaces}</Text>
              <Text style={styles.statLabel}>Places</Text>
            </View>
            <View style={styles.statCard}>
              <DollarSign size={24} color={colors.status.warning} />
              <Text style={styles.statValue}>
                {currency.symbol}
                {trip.stats.totalExpenses.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
          </View>

          {/* AI Summary Card */}
          {(isLoadingSummary || aiSummary) && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Sparkles size={20} color={colors.accent.primary} />
                <Text style={styles.summaryHeaderText}>Tomo's Summary</Text>
              </View>

              {isLoadingSummary ? (
                <View style={styles.aiSummaryLoading}>
                  <ActivityIndicator size="small" color={colors.accent.primary} />
                  <Text style={styles.aiSummaryLoadingText}>Generating your trip summary...</Text>
                </View>
              ) : aiSummary && (
                <>
                  <Text style={styles.aiSummaryText}>{aiSummary.summary}</Text>

                  {aiSummary.highlights && aiSummary.highlights.length > 0 && (
                    <View style={styles.highlightsContainer}>
                      {aiSummary.highlights.map((highlight, index) => (
                        <View key={index} style={styles.highlightChip}>
                          <Star size={12} color={colors.status.warning} />
                          <Text style={styles.highlightText}>{highlight}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {(aiSummary.favoritePlace || aiSummary.travelStyle) && (
                    <View style={styles.summaryFooter}>
                      {aiSummary.travelStyle && (
                        <View style={styles.travelStyleBadge}>
                          <User size={14} color={colors.accent.primary} />
                          <Text style={styles.travelStyleText}>{aiSummary.travelStyle}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Countries & Cities Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryText}>
              {trip.stats.countriesVisited}{' '}
              {trip.stats.countriesVisited === 1 ? 'country' : 'countries'} •{' '}
              {trip.stats.citiesVisited} {trip.stats.citiesVisited === 1 ? 'city' : 'cities'}
            </Text>
            <Text style={styles.countriesList}>{trip.countries.join(', ')}</Text>
          </View>

          {/* Interactive Map */}
          {allVisits.length > 0 && (
            <View style={styles.mapSection}>
              <Text style={styles.sectionTitle}>Your Journey</Text>
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={PROVIDER_GOOGLE}
                  customMapStyle={mapStyle}
                  initialRegion={getInitialRegion()}
                  scrollEnabled={true}
                  zoomEnabled={true}
                >
                  {allVisits.map((visit, index) => (
                    <Marker
                      key={`${visit.placeId}-${index}`}
                      coordinate={visit.coordinates}
                      title={visit.name}
                      description={visit.cityName}
                    >
                      <View style={[styles.markerContainer, { backgroundColor: visit.color }]}>
                        <Text style={styles.markerText}>{index + 1}</Text>
                      </View>
                    </Marker>
                  ))}
                </MapView>
              </View>
              {/* City legend */}
              <View style={styles.mapLegend}>
                {trip.cities.map((city, index) => (
                  <View key={`legend-${city.name}-${index}`} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: getCityColor(index) }]} />
                    <Text style={styles.legendText}>{city.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Cities & Visits */}
          <View style={styles.citiesSection}>
            <Text style={styles.sectionTitle}>Places Visited</Text>
            {trip.cities.map((city, index) => (
              <View key={`${city.name}-${index}`} style={styles.cityCard}>
                <View style={styles.cityHeader}>
                  <View style={[styles.cityDot, { backgroundColor: getCityColor(index) }]} />
                  <Text style={styles.cityName}>
                    {city.name}, {city.country}
                  </Text>
                </View>
                <Text style={styles.cityStats}>
                  {city.visits.length} {city.visits.length === 1 ? 'place' : 'places'} •{' '}
                  {currency.symbol}{city.totalExpenses.toLocaleString()}
                </Text>
                <Text style={styles.cityDates}>
                  {new Date(city.arrivedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {city.leftAt &&
                    ` - ${new Date(city.leftAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}`}
                </Text>

                {/* Visits in this city */}
                <View style={styles.visitsContainer}>
                  {city.visits.map((visit, vIndex) => (
                    <View key={`${visit.placeId}-${vIndex}`} style={styles.visitRow}>
                      <View style={[styles.visitNumber, { backgroundColor: getCityColor(index) }]}>
                        <Text style={styles.visitNumberText}>{vIndex + 1}</Text>
                      </View>
                      <View style={styles.visitInfo}>
                        <Text style={styles.visitName}>{visit.name}</Text>
                        <Text style={styles.visitNeighborhood}>{visit.neighborhood}</Text>
                      </View>
                      {visit.expense && (
                        <Text style={styles.visitExpense}>
                          {currency.symbol}{visit.expense.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Export Actions */}
          <View style={styles.exportSection}>
            <TouchableOpacity style={styles.exportButtonPrimary} onPress={handleShare}>
              <Share2 size={20} color={colors.text.inverse} />
              <Text style={styles.exportButtonTextPrimary}>Share Trip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={handleSendToChat}>
              <MessageCircle size={20} color={colors.accent.primary} />
              <Text style={styles.exportButtonText}>Chat about my trip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF}>
              <Download size={20} color={colors.accent.primary} />
              <Text style={styles.exportButtonText}>Export as PDF</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  titleSection: {
    padding: spacing.xl,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  tripTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  tripDates: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.status.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borders.radius.lg,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.muted,
    ...shadows.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  summarySection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  countriesList: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  mapSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  mapContainer: {
    height: 250,
    borderRadius: borders.radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.text.primary,
    ...shadows.sm,
  },
  markerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  mapLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '500',
  },
  citiesSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  cityCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.muted,
    ...shadows.sm,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  cityName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  cityStats: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: spacing.xl,
  },
  cityDates: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginLeft: spacing.xl,
    marginBottom: spacing.md,
  },
  visitsContainer: {
    marginTop: spacing.sm,
    marginLeft: spacing.xl,
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  visitNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  visitNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  visitInfo: {
    flex: 1,
  },
  visitName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  visitNeighborhood: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  visitExpense: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.status.warning,
    marginLeft: spacing.md,
  },
  exportSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  exportButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    ...shadows.glow,
  },
  exportButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  // AI Summary Card styles
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent.muted,
    ...shadows.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent.primary,
  },
  aiSummaryLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  aiSummaryLoadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  aiSummaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  highlightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
  },
  highlightText: {
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '500',
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  travelStyleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
  },
  travelStyleText: {
    fontSize: 13,
    color: colors.accent.primary,
    fontWeight: '600',
  },
});
