import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Train, Bus, TrendingUp, Star, MapPin } from 'lucide-react-native';
import { typography, spacing, colors, borders, shadows } from '../constants/theme';
import { Destination, Coordinates } from '../types';
import { config } from '../constants/config';

interface DestinationCardProps {
  destination: Destination;
  userLocation?: Coordinates;
  onSeeMore?: () => void;
  onTakeMeThere?: () => void;
}

/**
 * Convert photo name to full URL
 */
function getPhotoUrl(photoName: string, maxWidth: number = 400): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${config.googlePlacesApiKey}`;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display
 */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export function DestinationCard({ destination, userLocation, onSeeMore, onTakeMeThere }: DestinationCardProps) {
  const getTransitIcon = () => {
    const iconProps = {
      size: 16,
      color: colors.text.light.secondary,
      strokeWidth: 2,
    };

    switch (destination.transitPreview.method) {
      case 'train':
        return <Train {...iconProps} />;
      case 'bus':
        return <Bus {...iconProps} />;
      case 'walk':
        return <TrendingUp {...iconProps} />;
      default:
        return <Train {...iconProps} />;
    }
  };

  const getPriceLevelDots = () => {
    return '¥'.repeat(destination.priceLevel);
  };

  // Calculate distance if user location available
  const distance = userLocation
    ? formatDistance(calculateDistance(userLocation, destination.coordinates))
    : null;

  // Get first photo URL if available
  const photoUrl = destination.photos?.[0] ? getPhotoUrl(destination.photos[0], 600) : null;

  return (
    <View style={[styles.container, shadows.md]}>
      {/* Photo */}
      {photoUrl && (
        <Image
          source={{ uri: photoUrl }}
          style={styles.photo}
          resizeMode="cover"
        />
      )}

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {destination.title}
          </Text>
          <Text style={styles.priceLevel}>{getPriceLevelDots()}</Text>
        </View>

        {/* Meta Info Row (Rating + Distance) */}
        {(destination.rating || distance) && (
          <View style={styles.metaRow}>
            {destination.rating && (
              <View style={styles.ratingContainer}>
                <Star size={14} color="#FFB800" fill="#FFB800" strokeWidth={2} />
                <Text style={styles.ratingText}>{destination.rating.toFixed(1)}</Text>
              </View>
            )}
            {distance && (
              <View style={styles.distanceContainer}>
                <MapPin size={14} color={colors.text.light.secondary} strokeWidth={2} />
                <Text style={styles.distanceText}>{distance}</Text>
              </View>
            )}
          </View>
        )}

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {destination.description}
        </Text>

        {/* Transit Preview */}
        <View style={styles.transitContainer}>
          {getTransitIcon()}
          <Text style={styles.transitText}>
            {destination.transitPreview.description}
          </Text>
          {destination.transitPreview.line && (
            <Text style={styles.transitLine}>· {destination.transitPreview.line}</Text>
          )}
        </View>

        {/* Why Now Badge */}
        <View style={styles.whyNowContainer}>
          <Text style={styles.whyNow}>{destination.whyNow}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {onSeeMore && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onSeeMore}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonTextSecondary}>See more</Text>
            </TouchableOpacity>
          )}
          {onTakeMeThere && (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={onTakeMeThere}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonTextPrimary}>Take me there</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    overflow: 'hidden', // For photo border radius
  },
  photo: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.light.secondary,
  },
  title: {
    ...typography.presets.cardTitle,
    color: colors.text.light.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  priceLevel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.secondary,
  },
  description: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.text.light.secondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  transitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  transitText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.light.secondary,
  },
  transitLine: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.text.light.tertiary,
  },
  whyNowContainer: {
    backgroundColor: colors.status.successLight,
    borderRadius: borders.radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  whyNow: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.status.success,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borders.radius.md,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.interactive.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.interactive.secondary,
    borderWidth: 1,
    borderColor: colors.interactive.primary,
  },
  buttonTextPrimary: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.dark.primary,
  },
  buttonTextSecondary: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.interactive.primary,
  },
});

export default DestinationCard;
