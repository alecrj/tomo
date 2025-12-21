import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Navigation,
  Trash2,
  GripVertical,
  Calendar,
  Clock,
  Sparkles,
  Play,
  Coffee,
  Utensils,
  Camera,
  Landmark,
  Music,
  Bed,
} from 'lucide-react-native';
import { colors, spacing, typography, borders, shadows, mapStyle } from '../../constants/theme';
import { useItineraryStore } from '../../stores/useItineraryStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { useTripStore } from '../../stores/useTripStore';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../../utils/haptics';
import ItineraryMap from '../../components/ItineraryMap';
import type { Activity } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  food: { icon: Utensils, color: '#FF6B6B', label: 'Food' },
  culture: { icon: Landmark, color: '#4ECDC4', label: 'Culture' },
  activity: { icon: Camera, color: '#45B7D1', label: 'Activity' },
  transport: { icon: Navigation, color: '#96CEB4', label: 'Transport' },
  rest: { icon: Bed, color: '#DDA0DD', label: 'Rest' },
  coffee: { icon: Coffee, color: '#A0522D', label: 'Coffee' },
  nightlife: { icon: Music, color: '#9B59B6', label: 'Nightlife' },
};

export default function PlanScreen() {
  const router = useRouter();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  // Store state
  const itineraries = useItineraryStore((state) => state.itineraries);
  const activeItineraryId = useItineraryStore((state) => state.activeItineraryId);
  const activeItinerary = useMemo(() => {
    return itineraries.find((i) => i.id === activeItineraryId) || null;
  }, [itineraries, activeItineraryId]);
  const createItinerary = useItineraryStore((state) => state.createItinerary);
  const removeActivity = useItineraryStore((state) => state.removeActivity);
  const reorderActivities = useItineraryStore((state) => state.reorderActivities);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const currentTrip = useTripStore((state) => state.currentTrip);

  // Local state
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Get selected day data
  const selectedDay = useMemo(() => {
    if (!activeItinerary || !activeItinerary.days[selectedDayIndex]) return null;
    return activeItinerary.days[selectedDayIndex];
  }, [activeItinerary, selectedDayIndex]);

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

  // Handle activity navigation
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

  // Handle delete
  const handleDelete = (activityId: string) => {
    if (!activeItinerary || !selectedDay) return;

    safeHaptics.notification(NotificationFeedbackType.Warning);

    // Close the swipeable
    swipeableRefs.current.get(activityId)?.close();

    // Remove the activity
    removeActivity(activeItinerary.id, selectedDay.date, activityId);
  };

  // Handle reorder
  const handleDragEnd = ({ data }: { data: Activity[] }) => {
    if (!activeItinerary || !selectedDay) return;
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    const newOrder = data.map((a) => a.id);
    reorderActivities(activeItinerary.id, selectedDay.date, newOrder);
  };

  // Ask Tomo to plan
  const handleAskTomo = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/chat',
      params: { initialMessage: 'Plan my day' },
    });
  };

  // Render delete action
  const renderRightActions = (activityId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDelete(activityId)}
      >
        <Trash2 size={20} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  // Render activity item
  const renderActivityItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Activity>) => {
      const index = getIndex() ?? 0;
      const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.activity;
      const Icon = config.icon;
      const hasLocation = !!item.place?.coordinates;

      return (
        <ScaleDecorator>
          <Swipeable
            ref={(ref) => {
              if (ref) swipeableRefs.current.set(item.id, ref);
            }}
            renderRightActions={() => renderRightActions(item.id)}
            overshootRight={false}
            friction={2}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={drag}
              disabled={isActive}
              style={[
                styles.activityCard,
                isActive && styles.activityCardDragging,
              ]}
            >
              {/* Number badge */}
              <View style={[styles.numberBadge, { backgroundColor: config.color }]}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>

              {/* Content */}
              <View style={styles.activityContent}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.startTime && (
                    <Text style={styles.activityTime}>{item.startTime}</Text>
                  )}
                </View>

                <View style={styles.activityMeta}>
                  <Icon size={14} color={config.color} />
                  <Text style={styles.activityCategory}>{config.label}</Text>
                  {item.place?.estimatedCost && (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.activityCost}>{item.place.estimatedCost}</Text>
                    </>
                  )}
                </View>

                {item.description && (
                  <Text style={styles.activityDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
              </View>

              {/* Actions */}
              <View style={styles.activityActions}>
                {hasLocation && (
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => handleNavigate(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Navigation size={16} color={colors.accent.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onLongPress={drag}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <GripVertical size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Swipeable>

          {/* Travel time connector - show between activities */}
          {index < (selectedDay?.activities.length ?? 0) - 1 && (
            <View style={styles.travelConnector}>
              <View style={styles.travelLine} />
              <View style={styles.travelBadge}>
                <Clock size={10} color={colors.text.tertiary} />
                <Text style={styles.travelText}>
                  {/* Estimate ~5-15 min between stops */}
                  {5 + Math.floor(Math.random() * 10)} min
                </Text>
              </View>
              <View style={styles.travelLine} />
            </View>
          )}
        </ScaleDecorator>
      );
    },
    [selectedDay, activeItinerary]
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {activeItinerary ? (
          <View style={styles.content}>
            {/* Day selector */}
            <View style={styles.daySelector}>
              <TouchableOpacity
                style={styles.dayNavButton}
                onPress={handlePrevDay}
                disabled={selectedDayIndex === 0}
              >
                <ChevronLeft
                  size={24}
                  color={selectedDayIndex === 0 ? colors.text.tertiary : colors.text.primary}
                />
              </TouchableOpacity>

              <View style={styles.dayInfo}>
                <Text style={styles.dayTitle}>Day {selectedDayIndex + 1}</Text>
                {selectedDay && (
                  <Text style={styles.dayDate}>{formatDate(selectedDay.date)}</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.dayNavButton}
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
                    safeHaptics.selection();
                    setSelectedDayIndex(index);
                  }}
                />
              ))}
            </View>

            {/* Map */}
            {selectedDay && selectedDay.activities.length > 0 && (
              <View style={styles.mapContainer}>
                <ItineraryMap
                  activities={selectedDay.activities}
                  dayDate={selectedDay.date}
                  itineraryId={activeItinerary.id}
                  compact={false}
                />
              </View>
            )}

            {/* Activities list */}
            {selectedDay && selectedDay.activities.length > 0 ? (
              <DraggableFlatList
                data={selectedDay.activities}
                keyExtractor={(item) => item.id}
                renderItem={renderActivityItem}
                onDragEnd={handleDragEnd}
                containerStyle={styles.listContainer}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                  <TouchableOpacity style={styles.addButton} onPress={handleAskTomo}>
                    <Plus size={18} color={colors.text.tertiary} />
                    <Text style={styles.addButtonText}>Add stop</Text>
                  </TouchableOpacity>
                }
              />
            ) : (
              /* Empty day state */
              <View style={styles.emptyDay}>
                <Calendar size={40} color={colors.text.tertiary} />
                <Text style={styles.emptyDayTitle}>Nothing planned</Text>
                <Text style={styles.emptyDayText}>
                  Ask Tomo to plan this day or add stops manually
                </Text>
                <TouchableOpacity style={styles.planButton} onPress={handleAskTomo}>
                  <Sparkles size={18} color={colors.text.inverse} />
                  <Text style={styles.planButtonText}>Plan with Tomo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* No itinerary state */
          <View style={styles.emptyState}>
            <Calendar size={56} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No trip planned</Text>
            <Text style={styles.emptySubtitle}>
              Let Tomo create a perfect itinerary for you
            </Text>

            <TouchableOpacity style={styles.createButton} onPress={handleAskTomo}>
              <Sparkles size={20} color={colors.text.inverse} />
              <Text style={styles.createButtonText}>Plan with Tomo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.manualButton} onPress={handleCreateItinerary}>
              <Plus size={18} color={colors.text.secondary} />
              <Text style={styles.manualButtonText}>Create empty trip</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
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
  content: {
    flex: 1,
  },

  // Day selector
  daySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dayNavButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 2,
  },
  dayDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.default,
  },
  dayDotActive: {
    backgroundColor: colors.accent.primary,
    width: 24,
  },

  // Map
  mapContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },

  // Activities list
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },

  // Activity card
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  activityCardDragging: {
    ...shadows.lg,
    borderColor: colors.accent.primary,
    transform: [{ scale: 1.02 }],
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  activityContent: {
    flex: 1,
    gap: 4,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  activityTime: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activityCategory: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  metaDot: {
    color: colors.text.tertiary,
  },
  activityCost: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  activityDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  activityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Travel connector
  travelConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
    marginLeft: 14 + spacing.md, // Align with number badge center
  },
  travelLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.muted,
    maxWidth: 20,
  },
  travelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  travelText: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },

  // Delete action
  deleteAction: {
    backgroundColor: colors.status.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: borders.radius.lg,
    marginLeft: spacing.sm,
  },

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: borders.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },

  // Empty day state
  emptyDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyDayTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  emptyDayText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.lg,
    marginTop: spacing.md,
  },
  planButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },

  // Empty state (no itinerary)
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: borders.radius.lg,
  },
  createButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  manualButtonText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
});
