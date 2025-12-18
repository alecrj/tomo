import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Navigation,
  Check,
  X,
  Clock,
  MapPin,
  Send,
  ChevronLeft,
  ChevronRight,
  Star,
  Trash2,
  Coffee,
  Utensils,
  Camera as CameraIcon,
  Bus,
  Bed,
} from 'lucide-react-native';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { colors, spacing, borders, typography, shadows } from '../constants/theme';
import { useItineraryStore } from '../stores/useItineraryStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { modifyItinerary } from '../services/openai';
import type { Activity, TimeSlot, Destination, ActivityCategory, PlaceCardData } from '../types';

const TIME_SLOTS: { slot: TimeSlot; label: string; timeRange: string }[] = [
  { slot: 'morning', label: 'Morning', timeRange: '6am - 12pm' },
  { slot: 'afternoon', label: 'Afternoon', timeRange: '12pm - 5pm' },
  { slot: 'evening', label: 'Evening', timeRange: '5pm - 9pm' },
  { slot: 'night', label: 'Night', timeRange: '9pm+' },
];

const getCategoryIcon = (category: ActivityCategory) => {
  switch (category) {
    case 'food':
      return Utensils;
    case 'culture':
      return CameraIcon;
    case 'activity':
      return Star;
    case 'transport':
      return Bus;
    case 'rest':
      return Bed;
    default:
      return MapPin;
  }
};

export default function ItineraryScreen() {
  const router = useRouter();
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const viewDestination = useNavigationStore((state) => state.viewDestination);

  // Itinerary store
  const itineraries = useItineraryStore((state) => state.itineraries);
  const activeItineraryId = useItineraryStore((state) => state.activeItineraryId);
  const getActiveItinerary = useItineraryStore((state) => state.getActiveItinerary);
  const removeActivity = useItineraryStore((state) => state.removeActivity);
  const updateActivity = useItineraryStore((state) => state.updateActivity);

  const activeItinerary = getActiveItinerary();

  // Selected day index
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Additional store functions for modifications
  const addActivity = useItineraryStore((state) => state.addActivity);

  // Get activities for selected day grouped by time slot
  const dayActivities = useMemo((): Record<TimeSlot, Activity[]> => {
    const emptyGrouped: Record<TimeSlot, Activity[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    };

    if (!activeItinerary || !activeItinerary.days[selectedDayIndex]) {
      return emptyGrouped;
    }

    const activities = activeItinerary.days[selectedDayIndex].activities;
    const grouped: Record<TimeSlot, Activity[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    };

    activities.forEach((activity) => {
      grouped[activity.timeSlot].push(activity);
    });

    return grouped;
  }, [activeItinerary, selectedDayIndex]);

  const handleNavigateToActivity = (activity: Activity) => {
    if (!activity.place?.coordinates) {
      Alert.alert('No Location', 'This activity does not have a specific location.');
      return;
    }

    safeHaptics.impact(ImpactFeedbackStyle.Medium);

    const destination: Destination = {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      whatItIs: activity.description,
      whenToGo: '',
      neighborhood: neighborhood || '',
      category: 'food',
      whyNow: '',
      address: activity.place.address,
      coordinates: activity.place.coordinates,
      priceLevel: activity.place.priceLevel || 2,
      transitPreview: {
        method: 'walk',
        totalMinutes: parseInt(activity.place.distance?.replace(/\D/g, '') || '10'),
        description: activity.place.distance || '10 min walk',
      },
      spots: [],
    };

    viewDestination(destination);
    router.push('/navigation');
  };

  const handleCompleteActivity = (activity: Activity) => {
    if (!activeItinerary) return;

    safeHaptics.notification(NotificationFeedbackType.Success);
    const dayDate = activeItinerary.days[selectedDayIndex].date;
    updateActivity(activeItinerary.id, dayDate, activity.id, {
      booked: true, // Using booked as "completed" for now
    });
  };

  const handleRemoveActivity = (activity: Activity) => {
    if (!activeItinerary) return;

    Alert.alert(
      'Remove Activity',
      `Remove "${activity.title}" from your itinerary?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            safeHaptics.impact(ImpactFeedbackStyle.Medium);
            const dayDate = activeItinerary.days[selectedDayIndex].date;
            removeActivity(activeItinerary.id, dayDate, activity.id);
          },
        },
      ]
    );
  };

  const handlePrevDay = () => {
    if (selectedDayIndex > 0) {
      safeHaptics.selection();
      setSelectedDayIndex(selectedDayIndex - 1);
    }
  };

  const handleNextDay = () => {
    if (activeItinerary && selectedDayIndex < activeItinerary.days.length - 1) {
      safeHaptics.selection();
      setSelectedDayIndex(selectedDayIndex + 1);
    }
  };

  const handleChatSubmit = useCallback(async () => {
    if (!chatInput.trim() || !activeItinerary || isModifying) return;

    safeHaptics.impact(ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setIsModifying(true);
    setAiResponse(null);

    const userMessage = chatInput.trim();
    setChatInput('');

    try {
      // Prepare itinerary data for AI
      const itineraryForAI = {
        name: activeItinerary.name,
        days: activeItinerary.days.map((day) => ({
          date: day.date,
          activities: day.activities.map((a) => ({
            id: a.id,
            title: a.title,
            timeSlot: a.timeSlot,
            description: a.description,
          })),
        })),
      };

      const result = await modifyItinerary(
        userMessage,
        itineraryForAI,
        neighborhood || 'your current location'
      );

      // Handle the modification result
      switch (result.action) {
        case 'add':
          if (result.activityData) {
            const dayIndex = result.activityData.dayIndex ?? selectedDayIndex;
            const day = activeItinerary.days[dayIndex];
            if (day) {
              const placeCard: PlaceCardData | undefined = result.activityData.place
                ? {
                    name: result.activityData.place.name,
                    address: result.activityData.place.address,
                    coordinates: result.activityData.place.coordinates,
                    rating: result.activityData.place.rating,
                    priceLevel: result.activityData.place.priceLevel as 1 | 2 | 3 | 4 | undefined,
                  }
                : undefined;

              addActivity(activeItinerary.id, day.date, {
                timeSlot: result.activityData.timeSlot,
                title: result.activityData.title,
                description: result.activityData.description,
                category: result.activityData.category,
                place: placeCard,
                booked: false,
              });
              safeHaptics.notification(NotificationFeedbackType.Success);
            }
          }
          break;

        case 'remove':
          if (result.removeActivityId) {
            // Find the activity across all days and remove it
            for (const day of activeItinerary.days) {
              const activityIndex = day.activities.findIndex(
                (a) => a.id === result.removeActivityId
              );
              if (activityIndex >= 0) {
                removeActivity(activeItinerary.id, day.date, result.removeActivityId);
                safeHaptics.notification(NotificationFeedbackType.Success);
                break;
              }
            }
          }
          break;

        case 'move':
          // TODO: Implement move logic if needed
          break;

        case 'update':
          // TODO: Implement update logic if needed
          break;
      }

      // Show AI response
      setAiResponse(result.message);

      // Clear response after 5 seconds
      setTimeout(() => {
        setAiResponse(null);
      }, 5000);
    } catch (error) {
      console.error('[Itinerary] Modification error:', error);
      setAiResponse("Sorry, I couldn't make that change. Try again?");
      setTimeout(() => {
        setAiResponse(null);
      }, 3000);
    } finally {
      setIsModifying(false);
    }
  }, [chatInput, activeItinerary, isModifying, neighborhood, selectedDayIndex, addActivity, removeActivity]);

  const formatDayLabel = (date: number, index: number) => {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);

    if (dateStart.getTime() === today.getTime()) {
      return 'Today';
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStart.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }

    return `Day ${index + 1}`;
  };

  const renderActivityCard = (activity: Activity) => {
    const CategoryIcon = getCategoryIcon(activity.category);
    const isCompleted = activity.booked; // Using booked as completed

    return (
      <View
        key={activity.id}
        style={[styles.activityCard, isCompleted && styles.activityCardCompleted]}
      >
        <View style={styles.activityHeader}>
          <View style={styles.activityTime}>
            <Clock size={14} color={colors.text.tertiary} />
            <Text style={styles.activityTimeText}>
              {activity.startTime || activity.timeSlot}
            </Text>
          </View>
          <View style={styles.activityCategory}>
            <CategoryIcon size={14} color={colors.accent.primary} />
          </View>
        </View>

        <View style={styles.activityContent}>
          {activity.place?.photo && (
            <Image
              source={{ uri: activity.place.photo }}
              style={styles.activityImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.activityInfo}>
            <Text
              style={[styles.activityTitle, isCompleted && styles.activityTitleCompleted]}
              numberOfLines={2}
            >
              {activity.title}
            </Text>
            <Text style={styles.activityDescription} numberOfLines={2}>
              {activity.description}
            </Text>
            {activity.place && (
              <View style={styles.activityMeta}>
                <MapPin size={12} color={colors.text.tertiary} />
                <Text style={styles.activityAddress} numberOfLines={1}>
                  {activity.place.address}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.activityActions}>
          {activity.place?.coordinates && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleNavigateToActivity(activity)}
            >
              <Navigation size={16} color={colors.accent.primary} />
              <Text style={styles.actionButtonText}>Navigate</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButtonIcon, isCompleted && styles.actionButtonIconCompleted]}
            onPress={() => handleCompleteActivity(activity)}
          >
            <Check size={18} color={isCompleted ? colors.text.inverse : colors.status.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButtonIcon}
            onPress={() => handleRemoveActivity(activity)}
          >
            <Trash2 size={18} color={colors.status.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Empty state
  if (!activeItinerary) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Itinerary</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.emptyState}>
            <Calendar size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Itinerary Yet</Text>
            <Text style={styles.emptyDescription}>
              Ask Tomo to plan your trip! Try saying:{'\n'}
              "Plan my next 3 days in {neighborhood || 'this city'}"
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={() => router.push('/')}>
              <Plus size={20} color={colors.text.inverse} />
              <Text style={styles.createButtonText}>Ask Tomo to Plan</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const currentDay = activeItinerary.days[selectedDayIndex];
  const hasActivities = Object.values(dayActivities).some((arr) => arr.length > 0);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activeItinerary.name}
            </Text>
            <Text style={styles.headerSubtitle}>
              {activeItinerary.days.length} day{activeItinerary.days.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Day Selector */}
        <View style={styles.daySelector}>
          <TouchableOpacity
            style={[styles.dayNavButton, selectedDayIndex === 0 && styles.dayNavButtonDisabled]}
            onPress={handlePrevDay}
            disabled={selectedDayIndex === 0}
          >
            <ChevronLeft
              size={24}
              color={selectedDayIndex === 0 ? colors.text.tertiary : colors.text.primary}
            />
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabsContainer}
          >
            {activeItinerary.days.map((day, index) => (
              <TouchableOpacity
                key={day.date}
                style={[styles.dayTab, selectedDayIndex === index && styles.dayTabSelected]}
                onPress={() => {
                  safeHaptics.selection();
                  setSelectedDayIndex(index);
                }}
              >
                <Text
                  style={[
                    styles.dayTabText,
                    selectedDayIndex === index && styles.dayTabTextSelected,
                  ]}
                >
                  {formatDayLabel(day.date, index)}
                </Text>
                <Text
                  style={[
                    styles.dayTabDate,
                    selectedDayIndex === index && styles.dayTabDateSelected,
                  ]}
                >
                  {new Date(day.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.dayNavButton,
              selectedDayIndex === activeItinerary.days.length - 1 && styles.dayNavButtonDisabled,
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

        {/* Activities List */}
        <ScrollView
          style={styles.activitiesContainer}
          contentContainerStyle={styles.activitiesContent}
          showsVerticalScrollIndicator={false}
        >
          {!hasActivities ? (
            <View style={styles.noActivitiesState}>
              <Text style={styles.noActivitiesText}>No activities planned for this day</Text>
              <TouchableOpacity
                style={styles.addActivityButton}
                onPress={() => router.push('/')}
              >
                <Plus size={18} color={colors.accent.primary} />
                <Text style={styles.addActivityButtonText}>Add Activity</Text>
              </TouchableOpacity>
            </View>
          ) : (
            TIME_SLOTS.map(({ slot, label, timeRange }) => {
              const slotActivities = dayActivities[slot];
              if (slotActivities.length === 0) return null;

              return (
                <View key={slot} style={styles.timeSection}>
                  <View style={styles.timeSectionHeader}>
                    <Text style={styles.timeSectionTitle}>{label}</Text>
                    <Text style={styles.timeSectionTime}>{timeRange}</Text>
                  </View>
                  {slotActivities.map((activity) => renderActivityCard(activity))}
                </View>
              );
            })
          )}

          {/* Add Activity Button at bottom */}
          {hasActivities && (
            <TouchableOpacity
              style={styles.addActivityButtonLarge}
              onPress={() => router.push('/')}
            >
              <Plus size={20} color={colors.accent.primary} />
              <Text style={styles.addActivityButtonLargeText}>Add Activity</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* AI Response Banner */}
        {aiResponse && (
          <View style={styles.aiResponseBanner}>
            <Text style={styles.aiResponseText}>{aiResponse}</Text>
          </View>
        )}

        {/* Chat Input for Modifications */}
        <View style={styles.chatInputContainer}>
          <View style={styles.chatInputWrapper}>
            <TextInput
              style={styles.chatInput}
              placeholder="Ask Tomo to modify your itinerary..."
              placeholderTextColor={colors.text.tertiary}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={handleChatSubmit}
              returnKeyType="send"
              keyboardAppearance="dark"
              editable={!isModifying}
            />
            {isModifying ? (
              <View style={styles.chatLoadingContainer}>
                <ActivityIndicator size="small" color={colors.accent.primary} />
              </View>
            ) : chatInput.trim() ? (
              <TouchableOpacity style={styles.chatSendButton} onPress={handleChatSubmit}>
                <Send size={16} color={colors.text.inverse} />
              </TouchableOpacity>
            ) : (
              <View style={styles.chatSendButtonDisabled}>
                <Send size={16} color={colors.text.tertiary} />
              </View>
            )}
          </View>
        </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  // Day Selector
  daySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  dayNavButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNavButtonDisabled: {
    opacity: 0.5,
  },
  dayTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  dayTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    minWidth: 80,
  },
  dayTabSelected: {
    backgroundColor: colors.accent.primary,
  },
  dayTabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  dayTabTextSelected: {
    color: colors.text.inverse,
  },
  dayTabDate: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  dayTabDateSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Activities
  activitiesContainer: {
    flex: 1,
  },
  activitiesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  timeSection: {
    marginBottom: spacing.xl,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  timeSectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeSectionTime: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  activityCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  activityCardCompleted: {
    opacity: 0.7,
    backgroundColor: colors.background.tertiary,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  activityTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activityTimeText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  activityCategory: {
    width: 28,
    height: 28,
    borderRadius: borders.radius.full,
    backgroundColor: colors.accent.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  activityImage: {
    width: 60,
    height: 60,
    borderRadius: borders.radius.md,
    backgroundColor: colors.background.tertiary,
  },
  activityInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  activityTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  activityTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.secondary,
  },
  activityDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activityAddress: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    flex: 1,
  },
  activityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borders.radius.md,
    backgroundColor: colors.accent.muted,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.accent.primary,
  },
  actionButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: borders.radius.md,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonIconCompleted: {
    backgroundColor: colors.status.success,
  },
  // Empty/No Activities States
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyDescription: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borders.radius.full,
  },
  createButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },
  noActivitiesState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  noActivitiesText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  addActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borders.radius.full,
    backgroundColor: colors.accent.muted,
  },
  addActivityButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.accent.primary,
  },
  addActivityButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borders.radius.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  addActivityButtonLargeText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.accent.primary,
  },
  // Chat Input
  chatInputContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.input,
    borderRadius: borders.radius.xl,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chatInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  chatSendButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendButtonDisabled: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatLoadingContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiResponseBanner: {
    backgroundColor: colors.accent.muted,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.accent.primary,
  },
  aiResponseText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 22,
  },
});
