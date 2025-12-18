import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Calendar,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  ChevronRight,
  Edit3,
} from 'lucide-react-native';
import { safeHaptics, ImpactFeedbackStyle } from '../utils/haptics';
import { colors, spacing, borders, typography } from '../constants/theme';
import type { Itinerary, ItineraryDay, TimeSlot } from '../types';

interface ItineraryPreviewProps {
  itinerary: Itinerary;
  onViewFull?: () => void;
  onModify?: () => void;
}

interface DayPreviewProps {
  day: ItineraryDay;
  dayNumber: number;
  isExpanded?: boolean;
}

const getTimeSlotIcon = (slot: TimeSlot) => {
  switch (slot) {
    case 'morning':
      return <Sunrise size={14} color={colors.status.warning} />;
    case 'afternoon':
      return <Sun size={14} color={colors.status.warning} />;
    case 'evening':
      return <Sunset size={14} color={colors.accent.secondary} />;
    case 'night':
      return <Moon size={14} color={colors.text.secondary} />;
  }
};

const getTimeSlotLabel = (slot: TimeSlot) => {
  switch (slot) {
    case 'morning':
      return 'Morning';
    case 'afternoon':
      return 'Afternoon';
    case 'evening':
      return 'Evening';
    case 'night':
      return 'Night';
  }
};

function DayPreview({ day, dayNumber }: DayPreviewProps) {
  const date = new Date(day.date);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Group activities by time slot
  const slots: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night'];
  const activitiesBySlot = slots
    .map((slot) => ({
      slot,
      activities: day.activities.filter((a) => a.timeSlot === slot),
    }))
    .filter((s) => s.activities.length > 0);

  return (
    <View style={styles.dayContainer}>
      <View style={styles.dayHeader}>
        <Calendar size={16} color={colors.accent.primary} />
        <Text style={styles.dayTitle}>Day {dayNumber}</Text>
        <Text style={styles.dayDate}>{dateStr}</Text>
      </View>

      {activitiesBySlot.map(({ slot, activities }) => (
        <View key={slot} style={styles.slotContainer}>
          <View style={styles.slotHeader}>
            {getTimeSlotIcon(slot)}
            <Text style={styles.slotLabel}>{getTimeSlotLabel(slot)}</Text>
          </View>
          {activities.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <Text style={styles.activityTime}>
                {activity.startTime || ''}
              </Text>
              <Text style={styles.activityTitle} numberOfLines={1}>
                {activity.title}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {day.activities.length === 0 && (
        <Text style={styles.emptyDay}>No activities planned</Text>
      )}
    </View>
  );
}

export function ItineraryPreview({
  itinerary,
  onViewFull,
  onModify,
}: ItineraryPreviewProps) {
  const handleViewFull = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    onViewFull?.();
  };

  const handleModify = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    onModify?.();
  };

  // Show first 3 days max in preview
  const previewDays = itinerary.days.slice(0, 3);
  const hasMoreDays = itinerary.days.length > 3;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Calendar size={20} color={colors.accent.primary} />
        <Text style={styles.title}>{itinerary.name}</Text>
      </View>

      <Text style={styles.subtitle}>
        {itinerary.days.length} day{itinerary.days.length !== 1 ? 's' : ''} planned
      </Text>

      {/* Days Preview */}
      <View style={styles.daysContainer}>
        {previewDays.map((day, index) => (
          <DayPreview key={day.date} day={day} dayNumber={index + 1} />
        ))}

        {hasMoreDays && (
          <Text style={styles.moreText}>
            +{itinerary.days.length - 3} more day{itinerary.days.length - 3 !== 1 ? 's' : ''}...
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {onViewFull && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleViewFull}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>View Full Itinerary</Text>
            <ChevronRight size={18} color={colors.text.inverse} />
          </TouchableOpacity>
        )}
        {onModify && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleModify}
            activeOpacity={0.8}
          >
            <Edit3 size={16} color={colors.text.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  daysContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dayContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: borders.radius.md,
    padding: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dayTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  dayDate: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginLeft: 'auto',
  },
  slotContainer: {
    marginTop: spacing.sm,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  slotLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingVertical: spacing.xs,
  },
  activityTime: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    width: 50,
  },
  activityTitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    flex: 1,
  },
  emptyDay: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  moreText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
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
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borders.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
});

export default ItineraryPreview;
