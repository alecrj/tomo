import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Check,
  X,
  Calendar,
  Map,
} from 'lucide-react-native';
import { colors, spacing, typography, borders } from '../../constants/theme';
import { useItineraryStore } from '../../stores/useItineraryStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { useTripStore } from '../../stores/useTripStore';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../../utils/haptics';
import ItineraryMap from '../../components/ItineraryMap';
import type { Activity } from '../../types';

const TIME_SLOTS = ['morning', 'afternoon', 'evening', 'night'] as const;
const TIME_SLOT_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

export default function PlanScreen() {
  const router = useRouter();

  // Store state - use proper selectors to avoid re-render loops
  const itineraries = useItineraryStore((state) => state.itineraries);
  const activeItineraryId = useItineraryStore((state) => state.activeItineraryId);
  // Compute active itinerary in useMemo to avoid infinite loops from getActiveItinerary()
  const activeItinerary = useMemo(() => {
    return itineraries.find((i) => i.id === activeItineraryId) || null;
  }, [itineraries, activeItineraryId]);
  const createItinerary = useItineraryStore((state) => state.createItinerary);
  const updateActivity = useItineraryStore((state) => state.updateActivity);
  const removeActivity = useItineraryStore((state) => state.removeActivity);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const currentTrip = useTripStore((state) => state.currentTrip);

  // Local state
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Get activities for selected day
  const selectedDay = useMemo(() => {
    if (!activeItinerary || !activeItinerary.days[selectedDayIndex]) return null;
    return activeItinerary.days[selectedDayIndex];
  }, [activeItinerary, selectedDayIndex]);

  // Group activities by time slot
  const activitiesBySlot = useMemo(() => {
    if (!selectedDay) return {};
    const grouped: Record<string, Activity[]> = {};
    for (const slot of TIME_SLOTS) {
      grouped[slot] = selectedDay.activities.filter(a => a.timeSlot === slot);
    }
    return grouped;
  }, [selectedDay]);

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Create new itinerary
  const handleCreateItinerary = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 3);

    createItinerary(
      `${neighborhood || 'My'} Trip`,
      today.getTime(),
      endDate.getTime(),
      currentTrip?.id
    );
  };

  // Navigate days
  const handlePrevDay = () => {
    if (selectedDayIndex > 0) {
      safeHaptics.impact(ImpactFeedbackStyle.Light);
      setSelectedDayIndex(selectedDayIndex - 1);
    }
  };

  const handleNextDay = () => {
    if (activeItinerary && selectedDayIndex < activeItinerary.days.length - 1) {
      safeHaptics.impact(ImpactFeedbackStyle.Light);
      setSelectedDayIndex(selectedDayIndex + 1);
    }
  };

  // Track completed activities locally (since Activity type doesn't have completed field)
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());

  // Handle activity actions
  const handleComplete = (activityId: string) => {
    safeHaptics.notification(NotificationFeedbackType.Success);
    setCompletedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  };

  const isCompleted = (activityId: string) => completedActivities.has(activityId);

  const handleRemove = (activityId: string) => {
    if (!activeItinerary || !selectedDay) return;
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    removeActivity(activeItinerary.id, selectedDay.date, activityId);
  };

  const handleNavigate = (activity: Activity) => {
    if (activity.place?.coordinates) {
      safeHaptics.impact(ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/navigation',
        params: {
          name: activity.title,
          address: activity.place.address,
          lat: activity.place.coordinates.latitude,
          lng: activity.place.coordinates.longitude,
        },
      });
    }
  };

  // Ask Tomo to plan
  const handleAskTomo = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/chat',
      params: { initialMessage: 'Help me plan my day' },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Plan</Text>
          {!activeItinerary && (
            <TouchableOpacity style={styles.newButton} onPress={handleCreateItinerary}>
              <Plus size={20} color={colors.accent.primary} />
              <Text style={styles.newButtonText}>New Trip</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeItinerary ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Day navigation */}
            <View style={styles.dayNav}>
              <TouchableOpacity
                style={[styles.dayNavButton, selectedDayIndex === 0 && styles.dayNavDisabled]}
                onPress={handlePrevDay}
                disabled={selectedDayIndex === 0}
              >
                <ChevronLeft size={24} color={selectedDayIndex === 0 ? colors.text.tertiary : colors.text.primary} />
              </TouchableOpacity>

              <View style={styles.dayInfo}>
                <Text style={styles.dayTitle}>
                  Day {selectedDayIndex + 1}
                </Text>
                {selectedDay && (
                  <Text style={styles.dayDate}>
                    {formatDate(selectedDay.date)}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.dayNavButton,
                  selectedDayIndex === activeItinerary.days.length - 1 && styles.dayNavDisabled,
                ]}
                onPress={handleNextDay}
                disabled={selectedDayIndex === activeItinerary.days.length - 1}
              >
                <ChevronRight
                  size={24}
                  color={
                    selectedDayIndex === activeItinerary.days.length - 1
                      ? colors.text.tertiary
                      : colors.text.primary
                  }
                />
              </TouchableOpacity>
            </View>

            {/* Day dots */}
            <View style={styles.dayDots}>
              {activeItinerary.days.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayDot, index === selectedDayIndex && styles.dayDotActive]}
                  onPress={() => {
                    safeHaptics.impact(ImpactFeedbackStyle.Light);
                    setSelectedDayIndex(index);
                  }}
                />
              ))}
            </View>

            {/* Day Map */}
            {selectedDay && selectedDay.activities.length > 0 && (
              <View style={styles.mapSection}>
                <View style={styles.mapHeader}>
                  <Map size={16} color={colors.text.secondary} />
                  <Text style={styles.mapHeaderText}>Day Route</Text>
                </View>
                <ItineraryMap
                  activities={selectedDay.activities}
                  dayDate={selectedDay.date}
                  itineraryId={activeItinerary.id}
                  onActivityPress={(activity) => {
                    safeHaptics.impact(ImpactFeedbackStyle.Light);
                    // Could scroll to activity or show details
                  }}
                  compact
                />
              </View>
            )}

            {/* Activities by time slot */}
            {TIME_SLOTS.map((slot) => (
              <View key={slot} style={styles.timeSlotSection}>
                <Text style={styles.timeSlotTitle}>{TIME_SLOT_LABELS[slot]}</Text>

                {activitiesBySlot[slot]?.length > 0 ? (
                  activitiesBySlot[slot].map((activity) => (
                    <View
                      key={activity.id}
                      style={[styles.activityCard, isCompleted(activity.id) && styles.activityCompleted]}
                    >
                      {activity.startTime && (
                        <Text style={styles.activityTime}>{activity.startTime}</Text>
                      )}
                      <View style={styles.activityContent}>
                        <Text
                          style={[styles.activityTitle, isCompleted(activity.id) && styles.activityTitleCompleted]}
                        >
                          {activity.title}
                        </Text>
                        {activity.description && (
                          <Text style={styles.activityDescription} numberOfLines={2}>
                            {activity.description}
                          </Text>
                        )}
                        {activity.place && (
                          <Text style={styles.activityPlace} numberOfLines={1}>
                            {activity.place.name || activity.place.address}
                          </Text>
                        )}
                      </View>

                      <View style={styles.activityActions}>
                        {activity.place?.coordinates && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleNavigate(activity)}
                          >
                            <MapPin size={16} color={colors.accent.primary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleComplete(activity.id)}
                        >
                          <Check
                            size={16}
                            color={isCompleted(activity.id) ? colors.status.success : colors.text.tertiary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleRemove(activity.id)}
                        >
                          <X size={16} color={colors.status.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <TouchableOpacity style={styles.addActivityButton} onPress={handleAskTomo}>
                    <Plus size={16} color={colors.text.tertiary} />
                    <Text style={styles.addActivityText}>Add activity</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Modify with Tomo */}
            <TouchableOpacity style={styles.modifyButton} onPress={handleAskTomo}>
              <Text style={styles.modifyButtonText}>Modify with Tomo...</Text>
              <ChevronRight size={16} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </ScrollView>
        ) : (
          /* Empty state */
          <View style={styles.emptyState}>
            <Calendar size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No trip planned</Text>
            <Text style={styles.emptySubtitle}>
              Create an itinerary or ask Tomo to plan your day
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateItinerary}>
              <Plus size={20} color={colors.text.inverse} />
              <Text style={styles.emptyButtonText}>New Trip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.askButton} onPress={handleAskTomo}>
              <Text style={styles.askButtonText}>Ask Tomo to plan</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  newButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.accent.primary,
    fontWeight: typography.weights.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // Day navigation
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dayNavButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNavDisabled: {
    opacity: 0.5,
  },
  dayInfo: {
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  dayDate: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  dayDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.default,
  },
  dayDotActive: {
    backgroundColor: colors.accent.primary,
  },

  // Time slots
  timeSlotSection: {
    marginBottom: spacing.xl,
  },
  timeSlotTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  // Activity card
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  activityCompleted: {
    opacity: 0.6,
  },
  activityTime: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    fontWeight: typography.weights.medium,
    width: 60,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  activityTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.tertiary,
  },
  activityDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  activityPlace: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  activityActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borders.radius.sm,
    backgroundColor: colors.background.tertiary,
  },

  // Add activity
  addActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borders.radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  addActivityText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },

  // Modify button
  modifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  modifyButtonText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.lg,
    marginBottom: spacing.md,
  },
  emptyButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
  askButton: {
    padding: spacing.md,
  },
  askButtonText: {
    fontSize: typography.sizes.base,
    color: colors.accent.primary,
    fontWeight: typography.weights.medium,
  },

  // Map section
  mapSection: {
    marginBottom: spacing.xl,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  mapHeaderText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
