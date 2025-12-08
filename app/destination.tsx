import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Star,
  DollarSign,
  Train,
  Navigation as NavigationIcon,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { colors, spacing, typography, shadows } from '../constants/theme';
import { useDestinationsStore } from '../stores/useDestinationsStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { getTransitDirections } from '../services/routes';
import type { Destination } from '../types';

const { width } = Dimensions.get('window');

/**
 * Destination Detail Screen
 * Shows full information about a destination
 */
export default function DestinationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse destination from params
  const destination: Destination | null = params.destination
    ? JSON.parse(params.destination as string)
    : null;

  // Store state
  const coordinates = useLocationStore((state) => state.coordinates);
  const excludeDestination = useDestinationsStore((state) => state.excludeDestination);
  const startNavigation = useNavigationStore((state) => state.startNavigation);

  const [fetchingRoute, setFetchingRoute] = useState(false);

  if (!destination) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Destination not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleTakeMeThere = async () => {
    if (!coordinates) {
      Alert.alert('Error', 'Location not available. Please try again.');
      return;
    }

    try {
      setFetchingRoute(true);

      const route = await getTransitDirections(coordinates, destination.coordinates);

      if (!route) {
        Alert.alert('Route not found', 'Could not find transit directions.');
        return;
      }

      // Update navigation store
      startNavigation(destination, route);

      // Navigate to navigation screen
      router.push({
        pathname: '/navigation',
        params: {
          destination: JSON.stringify(destination),
          route: JSON.stringify(route),
        },
      });
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Could not fetch directions. Please try again.');
    } finally {
      setFetchingRoute(false);
    }
  };

  const handleSomethingElse = () => {
    Alert.alert(
      'Skip this destination?',
      "You won't see this suggestion again today.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            excludeDestination(destination.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        {destination.photos && destination.photos.length > 0 ? (
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: destination.photos[0] }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={[styles.heroContainer, styles.heroPlaceholder]}>
            <MapPin size={48} color={colors.text.light.tertiary} />
          </View>
        )}

        {/* Header */}
        <SafeAreaView style={styles.header} edges={['top']}>
          <TouchableOpacity style={styles.backButtonRound} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.light.primary} />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Content */}
        <View style={styles.content}>
          {/* Title & Meta */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{destination.title}</Text>
              <View style={styles.priceLevel}>
                <Text style={styles.priceLevelText}>
                  {'¥'.repeat(destination.priceLevel)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.neighborhood}>{destination.neighborhood}</Text>
              <Text style={styles.metaSeparator}>•</Text>
              <Text style={styles.category}>
                {destination.category.charAt(0).toUpperCase() + destination.category.slice(1)}
              </Text>
              {destination.rating && (
                <>
                  <Text style={styles.metaSeparator}>•</Text>
                  <View style={styles.ratingContainer}>
                    <Star size={14} color={colors.status.warning} fill={colors.status.warning} />
                    <Text style={styles.rating}>{destination.rating.toFixed(1)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Status (Open/Closed) */}
          {destination.isOpen !== undefined && (
            <View style={styles.statusSection}>
              <View style={[styles.statusBadge, destination.isOpen && styles.statusBadgeOpen]}>
                {destination.isOpen ? (
                  <CheckCircle size={16} color={colors.status.success} />
                ) : (
                  <XCircle size={16} color={colors.status.error} />
                )}
                <Text
                  style={[
                    styles.statusText,
                    destination.isOpen ? styles.statusTextOpen : styles.statusTextClosed,
                  ]}
                >
                  {destination.isOpen ? 'Open now' : 'Closed'}
                </Text>
              </View>
            </View>
          )}

          {/* Why Now */}
          <View style={styles.whyNowSection}>
            <Text style={styles.whyNowText}>{destination.whyNow}</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What it is</Text>
            <Text style={styles.sectionText}>{destination.whatItIs}</Text>
          </View>

          {/* When to Go */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>When to go</Text>
            <Text style={styles.sectionText}>{destination.whenToGo}</Text>
          </View>

          {/* Transit Preview */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <NavigationIcon size={20} color={colors.text.light.primary} />
              <Text style={styles.sectionTitle}>Getting there</Text>
            </View>
            <View style={styles.transitCard}>
              {getTransitIcon(destination.transitPreview.method)}
              <View style={styles.transitInfo}>
                <Text style={styles.transitMethod}>
                  {destination.transitPreview.line || 'Walking'}
                </Text>
                <Text style={styles.transitDescription}>
                  {destination.transitPreview.description}
                </Text>
              </View>
            </View>
          </View>

          {/* Estimated Cost */}
          {destination.estimatedCost && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <DollarSign size={20} color={colors.text.light.primary} />
                <Text style={styles.sectionTitle}>Estimated cost</Text>
              </View>
              <Text style={styles.costText}>¥{destination.estimatedCost.toLocaleString()}</Text>
            </View>
          )}

          {/* Hours */}
          {destination.hours && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clock size={20} color={colors.text.light.primary} />
                <Text style={styles.sectionTitle}>Hours</Text>
              </View>
              <Text style={styles.hoursText}>{destination.hours}</Text>
            </View>
          )}

          {/* Spots You Might Like */}
          {destination.spots && destination.spots.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spots you might like</Text>
              {destination.spots.map((spot, index) => (
                <View key={index} style={styles.spotCard}>
                  <View style={styles.spotHeader}>
                    <Text style={styles.spotName}>{spot.name}</Text>
                    {spot.rating && (
                      <View style={styles.spotRating}>
                        <Star
                          size={12}
                          color={colors.status.warning}
                          fill={colors.status.warning}
                        />
                        <Text style={styles.spotRatingText}>{spot.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.spotDescription}>{spot.description}</Text>
                  {spot.priceLevel && (
                    <Text style={styles.spotPrice}>{'¥'.repeat(spot.priceLevel)}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <SafeAreaView style={styles.actionsContainer} edges={['bottom']}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSomethingElse}
          disabled={fetchingRoute}
        >
          <Text style={styles.secondaryButtonText}>Something else</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, fetchingRoute && styles.primaryButtonDisabled]}
          onPress={handleTakeMeThere}
          disabled={fetchingRoute}
        >
          <Text style={styles.primaryButtonText}>
            {fetchingRoute ? 'Finding route...' : 'Take me there'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

// Helper: Get icon for transit method
function getTransitIcon(method: string) {
  switch (method) {
    case 'train':
    case 'bus':
      return <Train size={20} color={colors.interactive.primary} />;
    case 'walk':
      return <NavigationIcon size={20} color={colors.text.light.tertiary} />;
    default:
      return <NavigationIcon size={20} color={colors.text.light.tertiary} />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroContainer: {
    width,
    height: 280,
    backgroundColor: colors.surface.input,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backButtonRound: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xl,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  content: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: spacing.xl,
  },
  titleSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.light.primary,
    marginRight: spacing.lg,
  },
  priceLevel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface.input,
    borderRadius: 20,
  },
  priceLevelText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  neighborhood: {
    fontSize: typography.sizes.base,
    color: colors.text.light.secondary,
  },
  metaSeparator: {
    fontSize: typography.sizes.base,
    color: colors.text.light.tertiary,
    marginHorizontal: spacing.sm,
  },
  category: {
    fontSize: typography.sizes.base,
    color: colors.text.light.secondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.light.primary,
  },
  statusSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.status.errorLight,
    borderRadius: 20,
    gap: spacing.xs,
  },
  statusBadgeOpen: {
    backgroundColor: colors.status.successLight,
  },
  statusText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  statusTextOpen: {
    color: colors.status.success,
  },
  statusTextClosed: {
    color: colors.status.error,
  },
  whyNowSection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface.input,
    marginHorizontal: spacing.xl,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  whyNowText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
    color: colors.text.light.primary,
    fontWeight: typography.weights.medium,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginLeft: spacing.sm,
  },
  sectionText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
    color: colors.text.light.secondary,
  },
  transitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface.input,
    borderRadius: 12,
    gap: spacing.lg,
  },
  transitInfo: {
    flex: 1,
  },
  transitMethod: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginBottom: 4,
  },
  transitDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
  },
  costText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.light.primary,
  },
  hoursText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    color: colors.text.light.secondary,
  },
  spotCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface.input,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  spotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  spotName: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginRight: spacing.lg,
  },
  spotRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotRatingText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.light.primary,
  },
  spotDescription: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    color: colors.text.light.secondary,
    marginBottom: spacing.sm,
  },
  spotPrice: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.light.primary,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: spacing.lg,
    ...shadows.lg,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface.input,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  primaryButton: {
    flex: 2,
    paddingVertical: spacing.lg,
    backgroundColor: colors.interactive.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.surface.card,
  },
  bottomPadding: {
    height: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.text.light.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.interactive.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.surface.card,
  },
});
