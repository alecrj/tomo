import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Share,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowLeft, Share2, Download, MapPin, Calendar, DollarSign, Camera, MessageCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTripStore } from '../stores/useTripStore';
import { useConversationStore } from '../stores/useConversationStore';
import { detectCurrency } from '../utils/currency';
import type { ChatMessage } from '../types';

// City colors for map pins
const CITY_COLORS = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#AF52DE', // Purple
  '#FF3B30', // Red
  '#5AC8FA', // Teal
  '#FFCC00', // Yellow
  '#FF2D55', // Pink
];

const { width, height } = Dimensions.get('window');

export default function TripRecapScreen() {
  const { currentTrip, pastTrips } = useTripStore();
  const conversationStore = useConversationStore();
  const [selectedTrip, setSelectedTrip] = useState(currentTrip);
  const mapRef = useRef<MapView>(null);

  // If no trip selected, use current trip or most recent past trip
  useEffect(() => {
    if (!selectedTrip) {
      if (currentTrip) {
        setSelectedTrip(currentTrip);
      } else if (pastTrips.length > 0) {
        setSelectedTrip(pastTrips[pastTrips.length - 1]);
      }
    }
  }, [currentTrip, pastTrips]);

  // Get city color
  const getCityColor = (index: number) => CITY_COLORS[index % CITY_COLORS.length];

  if (!selectedTrip) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Recap</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySubtitle}>
            Start exploring and your trip will be tracked automatically
          </Text>
        </View>
      </View>
    );
  }

  const trip = selectedTrip;
  const allCoordinates = trip.cities.flatMap((city) =>
    city.visits.map((visit) => visit.coordinates)
  );

  // Calculate map region to fit all pins
  const initialRegion =
    allCoordinates.length > 0
      ? {
          latitude:
            allCoordinates.reduce((sum, coord) => sum + coord.latitude, 0) /
            allCoordinates.length,
          longitude:
            allCoordinates.reduce((sum, coord) => sum + coord.longitude, 0) /
            allCoordinates.length,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }
      : undefined;

  // Get currency for the first city (or USD as fallback)
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
    // For MVP, show alert that PDF export is coming soon
    Alert.alert(
      'Export PDF',
      'PDF export is coming soon! For now, you can share your trip summary.',
      [{ text: 'OK' }]
    );
  };

  const handleShare = async () => {
    if (!selectedTrip) return;

    try {
      const placesCount = selectedTrip.stats.totalPlaces;
      const daysCount = selectedTrip.stats.totalDays;
      const citiesList = selectedTrip.cities.map(c => c.name).join(', ');
      const topPlaces = selectedTrip.cities
        .flatMap(c => c.visits)
        .slice(0, 3)
        .map(v => v.name)
        .join(', ');

      const message = `My ${selectedTrip.name}\n\n` +
        `${daysCount} days • ${placesCount} places\n` +
        `Cities: ${citiesList}\n` +
        `Highlights: ${topPlaces}\n\n` +
        `Tracked with Tomo - your AI travel companion`;

      await Share.share({
        message,
        title: selectedTrip.name,
      });
    } catch (error) {
      console.error('[TripRecap] Share error:', error);
    }
  };

  const handleSendToChat = () => {
    // Create a summary message and send it to chat
    const summaryMessage: ChatMessage = {
      id: `recap-${Date.now()}`,
      role: 'user',
      content: 'Show me a summary of my trip',
      timestamp: Date.now(),
    };
    conversationStore.addMessage(summaryMessage);
    router.push('/');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Recap</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Share2 size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trip Title */}
        <View style={styles.titleSection}>
          <Text style={styles.tripTitle}>{trip.name}</Text>
          <Text style={styles.tripDates}>
            {startDate} - {endDate}
          </Text>
          {trip.isActive && <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active Trip</Text>
          </View>}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Calendar size={24} color="#007AFF" />
            <Text style={styles.statValue}>{trip.stats.totalDays}</Text>
            <Text style={styles.statLabel}>Days</Text>
          </View>
          <View style={styles.statCard}>
            <MapPin size={24} color="#34C759" />
            <Text style={styles.statValue}>{trip.stats.totalPlaces}</Text>
            <Text style={styles.statLabel}>Places</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={24} color="#FF9500" />
            <Text style={styles.statValue}>
              {currency.symbol}
              {trip.stats.totalExpenses.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
        </View>

        {/* Countries & Cities Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryText}>
            {trip.stats.countriesVisited}{' '}
            {trip.stats.countriesVisited === 1 ? 'country' : 'countries'} •{' '}
            {trip.stats.citiesVisited} {trip.stats.citiesVisited === 1 ? 'city' : 'cities'}
          </Text>
          <Text style={styles.countriesList}>
            {trip.countries.join(', ')}
          </Text>
        </View>

        {/* Map */}
        {allCoordinates.length > 0 && initialRegion && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Your Journey</Text>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={initialRegion}
              onLayout={() => {
                // Fit to show all markers
                if (mapRef.current && allCoordinates.length > 1) {
                  mapRef.current.fitToCoordinates(allCoordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: false,
                  });
                }
              }}
            >
              {trip.cities.map((city, cityIndex) =>
                city.visits.map((visit, visitIndex) => (
                  <Marker
                    key={`${visit.placeId}-${visitIndex}`}
                    coordinate={visit.coordinates}
                    title={visit.name}
                    description={`${city.name}, ${city.country}`}
                    pinColor={getCityColor(cityIndex)}
                  />
                ))
              )}
            </MapView>
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
                <Text style={styles.cityName}>
                  {city.name}, {city.country}
                </Text>
                <Text style={styles.cityStats}>
                  {city.visits.length} {city.visits.length === 1 ? 'place' : 'places'} •{' '}
                  {currency.symbol}
                  {city.totalExpenses.toLocaleString()}
                </Text>
              </View>
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
                    <View style={[styles.visitDot, { backgroundColor: getCityColor(index) }]} />
                    <View style={styles.visitInfo}>
                      <Text style={styles.visitName}>{visit.name}</Text>
                      <Text style={styles.visitNeighborhood}>{visit.neighborhood}</Text>
                      {visit.expense && (
                        <Text style={styles.visitExpense}>
                          {currency.symbol}
                          {visit.expense.toLocaleString()}
                        </Text>
                      )}
                    </View>
                    {visit.photos && visit.photos.length > 0 && (
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${visit.photos[0]}` }}
                        style={styles.visitThumbnail}
                      />
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
            <Share2 size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonTextPrimary}>Share Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton} onPress={handleSendToChat}>
            <MessageCircle size={20} color="#007AFF" />
            <Text style={styles.exportButtonText}>Chat about my trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportPDF}>
            <Download size={20} color="#007AFF" />
            <Text style={styles.exportButtonText}>Export as PDF</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    color: '#000000',
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
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  titleSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tripTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  tripDates: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  summarySection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  countriesList: {
    fontSize: 14,
    color: '#6B7280',
  },
  mapSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapLegend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    maxWidth: '80%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '500',
  },
  citiesSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  cityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cityName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  cityStats: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
  },
  cityDates: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  visitsContainer: {
    marginTop: 8,
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  visitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 12,
  },
  visitInfo: {
    flex: 1,
  },
  visitName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  visitNeighborhood: {
    fontSize: 13,
    color: '#6B7280',
  },
  visitExpense: {
    fontSize: 13,
    color: '#FF9500',
    marginTop: 2,
  },
  visitThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 12,
  },
  exportSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  exportButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exportButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
