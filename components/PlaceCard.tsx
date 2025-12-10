import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Star, Clock, MapPin } from 'lucide-react-native';
import { colors, spacing } from '../constants/theme';
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
              <MapPin size={14} color={colors.text.light.secondary} />
              <Text style={styles.metaText}>{placeCard.distance}</Text>
            </View>
          )}
        </View>

        {placeCard.openNow !== undefined && (
          <View style={[styles.badge, placeCard.openNow ? styles.openBadge : styles.closedBadge]}>
            <Clock size={12} color={placeCard.openNow ? '#34C759' : '#FF3B30'} />
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
            <TouchableOpacity style={styles.primaryButton} onPress={onTakeMeThere}>
              <Text style={styles.primaryButtonText}>Take me there</Text>
            </TouchableOpacity>
          )}
          {onSomethingElse && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onSomethingElse}>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: spacing.md,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.light.primary,
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
    color: colors.text.light.secondary,
  },
  priceText: {
    fontSize: 14,
    color: colors.text.light.secondary,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: spacing.sm,
  },
  openBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  closedBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  openText: {
    color: '#34C759',
  },
  closedText: {
    color: '#FF3B30',
  },
  hours: {
    fontSize: 13,
    color: colors.text.light.secondary,
    marginBottom: spacing.xs,
  },
  cost: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: spacing.xs,
  },
  address: {
    fontSize: 13,
    color: colors.text.light.tertiary,
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
    backgroundColor: '#007AFF',
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text.light.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
