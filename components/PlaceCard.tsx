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
// Animations disabled temporarily for stability
// import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Navigation,
  Shuffle,
  Clock,
  Footprints,
  Car,
  Train,
  Heart,
  Star,
  MapPin,
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
  isCompact?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_MARGIN = spacing.lg * 2;
const IMAGE_WIDTH = screenWidth - CARD_MARGIN;
const IMAGE_HEIGHT = 220; // Taller for more immersive feel
const COMPACT_IMAGE_HEIGHT = 160;

function PlaceCardComponent({
  placeCard,
  currencySymbol = '$',
  onTakeMeThere,
  onSomethingElse,
  onSave,
  isSaved = false,
  showBookingOptions = true,
  isCompact = false,
}: PlaceCardProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Get booking options
  const bookingOptions = showBookingOptions && !isCompact ? getPrimaryBookingOptions(placeCard) : [];

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

  // Build info items
  const walkTime = placeCard.walkTime || placeCard.distance;
  const priceDisplay = placeCard.estimatedCost ||
    (placeCard.priceLevel ? currencySymbol.repeat(placeCard.priceLevel) : null);
  const closingTime = placeCard.closingTime ||
    (placeCard.hours && placeCard.openNow ? `til ${placeCard.hours.split(' - ')[1] || placeCard.hours}` : null);

  const imageHeight = isCompact ? COMPACT_IMAGE_HEIGHT : IMAGE_HEIGHT;

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      {/* Image Section with Gradient Overlay */}
      {photos.length > 0 && (
        <View style={styles.imageContainer}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={IMAGE_WIDTH}
            snapToAlignment="start"
          >
            {photos.map((photo, index) => (
              <View key={index} style={[styles.imageWrapper, { height: imageHeight }]}>
                <Image
                  source={{ uri: photo }}
                  style={[styles.image, { height: imageHeight }]}
                  resizeMode="cover"
                />
                {/* Gradient overlay for text readability */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.imageGradient}
                />
              </View>
            ))}
          </ScrollView>

          {/* Save button overlay */}
          {onSave && (
            <TouchableOpacity
              style={[styles.saveButton, isSaved && styles.saveButtonActive]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Heart
                size={20}
                color={isSaved ? '#fff' : colors.text.primary}
                fill={isSaved ? colors.status.error : 'transparent'}
              />
            </TouchableOpacity>
          )}

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

          {/* Rating badge on image */}
          {placeCard.rating && (
            <View style={styles.ratingBadge}>
              <Star size={12} color="#FCD34D" fill="#FCD34D" />
              <Text style={styles.ratingBadgeText}>{placeCard.rating.toFixed(1)}</Text>
              {placeCard.reviewCount && (
                <Text style={styles.reviewCountBadge}>
                  ({placeCard.reviewCount >= 1000
                    ? `${(placeCard.reviewCount / 1000).toFixed(1)}k`
                    : placeCard.reviewCount})
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Content Section */}
      <View style={[styles.content, isCompact && styles.contentCompact]}>
        {/* Place Name & Cuisine */}
        <View style={styles.header}>
          <Text style={[styles.name, isCompact && styles.nameCompact]} numberOfLines={1}>
            {placeCard.name}
          </Text>
          {placeCard.cuisine && (
            <Text style={styles.cuisine}>{placeCard.cuisine}</Text>
          )}
        </View>

        {/* Tomo's Description */}
        {placeCard.description && !isCompact && (
          <Text style={styles.description} numberOfLines={2}>
            {placeCard.description}
          </Text>
        )}

        {/* Quick Info Row */}
        <View style={styles.infoRow}>
          {walkTime && (
            <View style={styles.infoItem}>
              <Footprints size={14} color={colors.accent.primary} />
              <Text style={styles.infoText}>{walkTime}</Text>
            </View>
          )}
          {placeCard.transitTime && (
            <View style={styles.infoItem}>
              <Train size={14} color={colors.status.info} />
              <Text style={styles.infoText}>{placeCard.transitTime}</Text>
            </View>
          )}
          {priceDisplay && (
            <View style={styles.infoItem}>
              <Text style={styles.priceText}>{priceDisplay}</Text>
            </View>
          )}
          {closingTime && placeCard.openNow !== false && (
            <View style={styles.infoItem}>
              <Clock size={14} color={colors.text.tertiary} />
              <Text style={styles.infoText}>{closingTime}</Text>
            </View>
          )}
          {placeCard.openNow === false && (
            <View style={[styles.infoItem, styles.closedItem]}>
              <Text style={styles.closedText}>Closed</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {(onTakeMeThere || onSomethingElse) && !isCompact && (
          <View style={styles.actions}>
            {onTakeMeThere && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleTakeMeThere}
                activeOpacity={0.85}
              >
                <Navigation size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Take me there</Text>
              </TouchableOpacity>
            )}
            {onSomethingElse && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSomethingElse}
                activeOpacity={0.8}
              >
                <Shuffle size={18} color={colors.text.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Compact Actions */}
        {isCompact && onTakeMeThere && (
          <TouchableOpacity
            style={styles.compactButton}
            onPress={handleTakeMeThere}
            activeOpacity={0.85}
          >
            <Navigation size={16} color="#fff" />
            <Text style={styles.compactButtonText}>Go</Text>
          </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius['2xl'],
    overflow: 'hidden',
    marginTop: spacing.md,
    ...shadows.md,
  },
  containerCompact: {
    marginTop: spacing.sm,
  },

  // Image Section
  imageContainer: {
    position: 'relative',
  },
  imageWrapper: {
    width: IMAGE_WIDTH,
    position: 'relative',
  },
  image: {
    width: IMAGE_WIDTH,
    backgroundColor: colors.background.tertiary,
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  saveButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonActive: {
    backgroundColor: colors.status.error,
  },
  pagination: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 20,
    borderRadius: 3,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borders.radius.full,
  },
  ratingBadgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  reviewCountBadge: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },

  // Content Section
  content: {
    padding: spacing.lg,
  },
  contentCompact: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  nameCompact: {
    fontSize: typography.sizes.lg,
  },
  cuisine: {
    fontSize: typography.sizes.sm,
    color: colors.accent.primary,
    fontWeight: typography.weights.medium,
  },
  description: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  priceText: {
    fontSize: typography.sizes.sm,
    color: colors.accent.primary,
    fontWeight: typography.weights.semibold,
  },
  closedItem: {
    backgroundColor: colors.status.errorMuted,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borders.radius.sm,
  },
  closedText: {
    fontSize: typography.sizes.xs,
    color: colors.status.error,
    fontWeight: typography.weights.semibold,
  },

  // Action Buttons
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
    borderRadius: borders.radius.xl,
    ...shadows.glowSoft,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borders.radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borders.radius.lg,
    alignSelf: 'flex-start',
  },
  compactButtonText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },

  // Booking
  bookingContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  bookingLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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

// Custom comparison for React.memo - only re-render when data changes
function arePropsEqual(prevProps: PlaceCardProps, nextProps: PlaceCardProps): boolean {
  if (prevProps.currencySymbol !== nextProps.currencySymbol) return false;
  if (prevProps.isSaved !== nextProps.isSaved) return false;
  if (prevProps.showBookingOptions !== nextProps.showBookingOptions) return false;
  if (prevProps.isCompact !== nextProps.isCompact) return false;

  const prevCard = prevProps.placeCard;
  const nextCard = nextProps.placeCard;
  if (prevCard.placeId !== nextCard.placeId) return false;
  if (prevCard.name !== nextCard.name) return false;
  if (prevCard.rating !== nextCard.rating) return false;
  if (prevCard.openNow !== nextCard.openNow) return false;
  if (prevCard.photo !== nextCard.photo) return false;
  if (prevCard.photos?.length !== nextCard.photos?.length) return false;

  return true;
}

export const PlaceCard = React.memo(PlaceCardComponent, arePropsEqual);
