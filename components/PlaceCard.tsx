import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  Navigation,
  Shuffle,
  Clock,
  Footprints,
  Car,
  Train,
  Heart,
} from 'lucide-react-native';
import { safeHaptics, ImpactFeedbackStyle } from '../utils/haptics';
import { colors, spacing, borders, shadows, typography } from '../constants/theme';
import { getPrimaryBookingOptions, openBookingUrl, BookingOption } from '../services/booking';
import type { PlaceCardData } from '../types';

interface PlaceCardProps {
  placeCard: PlaceCardData;
  currencySymbol?: string;
  onTakeMeThere?: () => void;
  onSomethingElse?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  showBookingOptions?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const IMAGE_WIDTH = screenWidth - spacing.lg * 4; // Account for message padding
const IMAGE_HEIGHT = 180;

export function PlaceCard({
  placeCard,
  currencySymbol = '$',
  onTakeMeThere,
  onSomethingElse,
  onSave,
  isSaved = false,
  showBookingOptions = true,
}: PlaceCardProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Get booking options
  const bookingOptions = showBookingOptions ? getPrimaryBookingOptions(placeCard) : [];

  // Build photos array (support both single photo and multiple photos)
  const photos = placeCard.photos?.length
    ? placeCard.photos
    : placeCard.photo
      ? [placeCard.photo]
      : [];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / IMAGE_WIDTH);
    setActiveIndex(index);
  };

  const handleTakeMeThere = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    onTakeMeThere?.();
  };

  const handleSomethingElse = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    onSomethingElse?.();
  };

  const handleSave = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    onSave?.();
  };

  const handleBooking = async (option: BookingOption) => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    await openBookingUrl(option.url);
  };

  // Build info pills
  const infoPills: { icon: React.ReactNode; label: string }[] = [];

  // Walk time (from walkTime or distance field)
  const walkTime = placeCard.walkTime || placeCard.distance;
  if (walkTime) {
    infoPills.push({
      icon: <Footprints size={14} color={colors.text.secondary} />,
      label: walkTime,
    });
  }

  if (placeCard.transitTime) {
    infoPills.push({
      icon: <Train size={14} color={colors.text.secondary} />,
      label: placeCard.transitTime,
    });
  }

  if (placeCard.driveTime) {
    infoPills.push({
      icon: <Car size={14} color={colors.text.secondary} />,
      label: placeCard.driveTime,
    });
  }

  // Price (from estimatedCost or priceLevel)
  const priceDisplay = placeCard.estimatedCost ||
    (placeCard.priceLevel ? currencySymbol.repeat(placeCard.priceLevel) : null);
  if (priceDisplay) {
    infoPills.push({
      icon: null,
      label: priceDisplay.startsWith('~') ? priceDisplay : `~${priceDisplay}`,
    });
  }

  // Closing time
  const closingTime = placeCard.closingTime ||
    (placeCard.hours && placeCard.openNow ? `til ${placeCard.hours.split(' - ')[1] || placeCard.hours}` : null);
  if (closingTime && placeCard.openNow !== false) {
    infoPills.push({
      icon: <Clock size={14} color={colors.text.secondary} />,
      label: closingTime,
    });
  }

  return (
    <View style={styles.container}>
      {/* Image Carousel */}
      {photos.length > 0 && (
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={IMAGE_WIDTH + spacing.sm}
            snapToAlignment="start"
            contentContainerStyle={styles.carouselContent}
          >
            {photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo }}
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Pagination dots */}
          {photos.length > 1 && (
            <View style={styles.pagination}>
              {photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activeIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Place Name */}
      <Text style={styles.name}>{placeCard.name}</Text>

      {/* Rating */}
      {placeCard.rating && (
        <Text style={styles.rating}>
          {'★'.repeat(Math.round(placeCard.rating))}{'☆'.repeat(5 - Math.round(placeCard.rating))} {placeCard.rating.toFixed(1)}
        </Text>
      )}

      {/* Tomo's Description (if available) */}
      {placeCard.description && (
        <Text style={styles.description}>{placeCard.description}</Text>
      )}

      {/* Info Pills */}
      {infoPills.length > 0 && (
        <View style={styles.pillsContainer}>
          {infoPills.map((pill, index) => (
            <View key={index} style={styles.pill}>
              {pill.icon}
              <Text style={styles.pillText}>{pill.label}</Text>
            </View>
          ))}
          {placeCard.openNow === false && (
            <View style={[styles.pill, styles.closedPill]}>
              <Text style={styles.closedText}>Closed</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      {(onTakeMeThere || onSomethingElse || onSave) && (
        <View style={styles.actions}>
          {onTakeMeThere && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleTakeMeThere}
              activeOpacity={0.8}
            >
              <Navigation size={18} color={colors.text.inverse} />
              <Text style={styles.primaryButtonText}>Take me there</Text>
            </TouchableOpacity>
          )}
          {onSave && (
            <TouchableOpacity
              style={[styles.secondaryButton, isSaved && styles.savedButton]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Heart
                size={18}
                color={isSaved ? colors.status.error : colors.text.primary}
                fill={isSaved ? colors.status.error : 'transparent'}
              />
            </TouchableOpacity>
          )}
          {onSomethingElse && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSomethingElse}
              activeOpacity={0.8}
            >
              <Shuffle size={16} color={colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Booking Options */}
      {bookingOptions.length > 0 && (
        <View style={styles.bookingContainer}>
          <Text style={styles.bookingLabel}>Quick Actions</Text>
          <View style={styles.bookingOptions}>
            {bookingOptions.map((option) => (
              <TouchableOpacity
                key={option.provider}
                style={styles.bookingButton}
                onPress={() => handleBooking(option)}
                activeOpacity={0.7}
              >
                <Text style={styles.bookingIcon}>{option.icon}</Text>
                <Text style={styles.bookingText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  carouselContainer: {
    marginBottom: spacing.md,
  },
  carouselContent: {
    gap: spacing.sm,
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    borderRadius: borders.radius.lg,
    backgroundColor: colors.background.tertiary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text.tertiary,
  },
  dotActive: {
    backgroundColor: colors.accent.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  rating: {
    fontSize: typography.sizes.sm,
    color: colors.status.warning,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borders.radius.full,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  pillText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  closedPill: {
    backgroundColor: colors.status.errorMuted,
    borderColor: colors.status.error,
  },
  closedText: {
    fontSize: typography.sizes.sm,
    color: colors.status.error,
    fontWeight: typography.weights.medium,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.md,
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
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borders.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  savedButton: {
    backgroundColor: colors.status.errorMuted,
    borderColor: colors.status.error,
  },
  bookingContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  bookingLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  bookingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borders.radius.full,
  },
  bookingIcon: {
    fontSize: 14,
  },
  bookingText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
});
