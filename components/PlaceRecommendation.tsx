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
} from 'lucide-react-native';
import { safeHaptics, ImpactFeedbackStyle } from '../utils/haptics';
import { colors, spacing, borders, shadows, typography } from '../constants/theme';

interface PlaceRecommendationProps {
  name: string;
  photos: string[]; // Multiple photos for carousel
  description?: string; // Tomo's conversational description
  walkTime?: string; // "8 min"
  transitTime?: string; // "15 min"
  driveTime?: string; // "5 min"
  price?: string; // "~$4" or "$$"
  closingTime?: string; // "til 4pm" or "til 10pm"
  isOpen?: boolean;
  rating?: number;
  onNavigate?: () => void;
  onShowOthers?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const IMAGE_WIDTH = screenWidth - spacing.lg * 2 - spacing.xl; // Account for message padding
const IMAGE_HEIGHT = 180;

export function PlaceRecommendation({
  name,
  photos,
  description,
  walkTime,
  transitTime,
  driveTime,
  price,
  closingTime,
  isOpen,
  rating,
  onNavigate,
  onShowOthers,
}: PlaceRecommendationProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / IMAGE_WIDTH);
    setActiveIndex(index);
  };

  const handleNavigate = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    onNavigate?.();
  };

  const handleShowOthers = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    onShowOthers?.();
  };

  // Build info pills
  const infoPills: { icon: React.ReactNode; label: string }[] = [];

  if (walkTime) {
    infoPills.push({
      icon: <Footprints size={14} color={colors.text.secondary} />,
      label: walkTime,
    });
  }

  if (transitTime) {
    infoPills.push({
      icon: <Train size={14} color={colors.text.secondary} />,
      label: transitTime,
    });
  }

  if (driveTime) {
    infoPills.push({
      icon: <Car size={14} color={colors.text.secondary} />,
      label: driveTime,
    });
  }

  if (price) {
    infoPills.push({
      icon: null,
      label: price,
    });
  }

  if (closingTime && isOpen !== false) {
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
      <Text style={styles.name}>{name}</Text>

      {/* Rating if available */}
      {rating && (
        <Text style={styles.rating}>
          {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))} {rating.toFixed(1)}
        </Text>
      )}

      {/* Tomo's Description */}
      {description && (
        <Text style={styles.description}>{description}</Text>
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
          {isOpen === false && (
            <View style={[styles.pill, styles.closedPill]}>
              <Text style={styles.closedText}>Closed</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {onNavigate && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleNavigate}
            activeOpacity={0.8}
          >
            <Navigation size={18} color={colors.text.inverse} />
            <Text style={styles.primaryButtonText}>Take me there</Text>
          </TouchableOpacity>
        )}
        {onShowOthers && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleShowOthers}
            activeOpacity={0.8}
          >
            <Shuffle size={18} color={colors.text.primary} />
            <Text style={styles.secondaryButtonText}>Others</Text>
          </TouchableOpacity>
        )}
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borders.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
});

export default PlaceRecommendation;
