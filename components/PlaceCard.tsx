import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Star, Clock, MapPin } from 'lucide-react-native';
import { safeHaptics, ImpactFeedbackStyle } from '../utils/haptics';
import { colors, spacing, borders, shadows } from '../constants/theme';
import type { PlaceCardData } from '../types';

interface PlaceCardProps {
  placeCard: PlaceCardData;
  currencySymbol?: string;
  onTakeMeThere?: () => void;
  onSomethingElse?: () => void;
}

export function PlaceCard({
  placeCard,
  currencySymbol = '$',
  onTakeMeThere,
  onSomethingElse,
}: PlaceCardProps) {
  const getPriceLevelString = (level?: number) => {
    if (!level) return '';
    return currencySymbol.repeat(level);
  };

  const handleTakeMeThere = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    onTakeMeThere?.();
  };

  const handleSomethingElse = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    onSomethingElse?.();
  };

  return (
    <View style={styles.card}>
      {placeCard.photo && (
        <Image
          source={{ uri: placeCard.photo }}
          style={styles.photo}
          resizeMode="cover"
        />
      )}

      <View style={styles.content}>
        <Text style={styles.name}>{placeCard.name}</Text>

        <View style={styles.meta}>
          {placeCard.rating && (
            <View style={styles.metaItem}>
              <Star size={14} color="#FFB800" fill="#FFB800" />
              <Text style={styles.metaText}>{placeCard.rating.toFixed(1)}</Text>
            </View>
          )}

          {placeCard.priceLevel && (
            <Text style={styles.priceText}>
              {getPriceLevelString(placeCard.priceLevel)}
            </Text>
          )}

          {placeCard.distance && (
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.text.secondary} />
              <Text style={styles.metaText}>{placeCard.distance}</Text>
            </View>
          )}
        </View>

        {placeCard.openNow !== undefined && (
          <View style={[styles.badge, placeCard.openNow ? styles.openBadge : styles.closedBadge]}>
            <Clock size={12} color={placeCard.openNow ? colors.status.success : colors.status.error} />
            <Text style={[styles.badgeText, placeCard.openNow ? styles.openText : styles.closedText]}>
              {placeCard.openNow ? 'Open now' : 'Closed'}
            </Text>
          </View>
        )}

        {placeCard.hours && (
          <Text style={styles.hours}>{placeCard.hours}</Text>
        )}

        {placeCard.estimatedCost && (
          <Text style={styles.cost}>~{placeCard.estimatedCost}</Text>
        )}

        {placeCard.address && (
          <Text style={styles.address} numberOfLines={2}>
            {placeCard.address}
          </Text>
        )}
      </View>

      {(onTakeMeThere || onSomethingElse) && (
        <View style={styles.actions}>
          {onTakeMeThere && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleTakeMeThere}>
              <Text style={styles.primaryButtonText}>Take me there</Text>
            </TouchableOpacity>
          )}
          {onSomethingElse && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSomethingElse}>
              <Text style={styles.secondaryButtonText}>Something else</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.xl,
    overflow: 'hidden',
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.md,
  },
  photo: {
    width: '100%',
    height: 120, // Reduced from 160px
  },
  content: {
    padding: spacing.md,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  priceText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borders.radius.sm,
    gap: 4,
    marginBottom: spacing.sm,
  },
  openBadge: {
    backgroundColor: colors.status.successMuted,
  },
  closedBadge: {
    backgroundColor: colors.status.errorMuted,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  openText: {
    color: colors.status.success,
  },
  closedText: {
    color: colors.status.error,
  },
  hours: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  cost: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent.primary,
    marginBottom: spacing.xs,
  },
  address: {
    fontSize: 13,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
