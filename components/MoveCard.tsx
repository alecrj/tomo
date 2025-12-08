import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Train, Bus, TrendingUp, Clock } from 'lucide-react-native';
import { typography, spacing, colors, borders, shadows } from '../constants/theme';
import { Move } from '../types';

interface MoveCardProps {
  move: Move;
  isSelected?: boolean;
  onPress?: () => void;
}

export function MoveCard({ move, isSelected = false, onPress }: MoveCardProps) {
  const getTransitIcon = () => {
    const iconProps = {
      size: 16,
      color: colors.text.light.secondary,
      strokeWidth: 2,
    };

    switch (move.transit.method) {
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
    return '¥'.repeat(move.priceLevel);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.container,
        shadows.md,
        isSelected && styles.selected,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {move.title}
        </Text>
        <Text style={styles.priceLevel}>{getPriceLevelDots()}</Text>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {move.description}
      </Text>

      {/* Why Now */}
      <View style={styles.whyNowContainer}>
        <Text style={styles.whyNow}>{move.whyNow}</Text>
      </View>

      {/* Meta Info */}
      <View style={styles.metaRow}>
        {/* Transit */}
        <View style={styles.metaItem}>
          {getTransitIcon()}
          <Text style={styles.metaText}>
            {move.transit.totalMinutes}min
            {move.transit.line && ` • ${move.transit.line}`}
          </Text>
        </View>

        {/* Duration */}
        <View style={styles.metaItem}>
          <Clock size={16} color={colors.text.light.secondary} strokeWidth={2} />
          <Text style={styles.metaText}>{formatDuration(move.duration)}</Text>
        </View>

        {/* Cost */}
        {move.estimatedCost && (
          <Text style={styles.cost}>¥{move.estimatedCost.toLocaleString()}</Text>
        )}
      </View>

      {/* Highlights */}
      {move.highlights.length > 0 && (
        <View style={styles.highlightsContainer}>
          {move.highlights.slice(0, 2).map((highlight, index) => (
            <View key={index} style={styles.highlight}>
              <View style={styles.highlightDot} />
              <Text style={styles.highlightText} numberOfLines={1}>
                {highlight}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
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
  selected: {
    borderWidth: 2,
    borderColor: colors.interactive.primary,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.presets.cardMeta,
    color: colors.text.light.secondary,
  },
  cost: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginLeft: 'auto',
  },
  highlightsContainer: {
    gap: spacing.xs,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  highlightDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text.light.tertiary,
  },
  highlightText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.text.light.secondary,
    flex: 1,
  },
});

export default MoveCard;
