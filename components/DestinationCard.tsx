import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Train, Bus, TrendingUp } from 'lucide-react-native';
import { typography, spacing, colors, borders, shadows } from '../constants/theme';
import { Destination } from '../types';

interface DestinationCardProps {
  destination: Destination;
  onSeeMore?: () => void;
  onTakeMeThere?: () => void;
}

export function DestinationCard({ destination, onSeeMore, onTakeMeThere }: DestinationCardProps) {
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

  return (
    <View style={[styles.container, shadows.md]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {destination.title}
        </Text>
        <Text style={styles.priceLevel}>{getPriceLevelDots()}</Text>
      </View>

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
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
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
