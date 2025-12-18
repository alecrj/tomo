import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Train,
  Clock,
  CloudRain,
  Calendar,
  Wallet,
  Bus,
  X,
  CheckCheck,
  AlertTriangle,
  Info,
  Trash2,
} from 'lucide-react-native';
import { safeHaptics, ImpactFeedbackStyle } from '../utils/haptics';
import { colors, spacing, borders, typography, shadows } from '../constants/theme';
import { useNotificationStore } from '../stores/useNotificationStore';
import type { Notification, NotificationType, NotificationPriority } from '../types';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'last_train':
      return Train;
    case 'place_closing':
      return Clock;
    case 'weather':
      return CloudRain;
    case 'itinerary':
      return Calendar;
    case 'budget':
      return Wallet;
    case 'transit':
      return Bus;
    default:
      return Bell;
  }
};

const getPriorityColor = (priority: NotificationPriority) => {
  switch (priority) {
    case 'urgent':
      return colors.status.error;
    case 'warning':
      return colors.status.warning;
    case 'info':
    default:
      return colors.accent.primary;
  }
};

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

interface NotificationItemProps {
  notification: Notification;
  onDismiss: () => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.type);
  const priorityColor = getPriorityColor(notification.priority);

  return (
    <View
      style={[
        styles.notificationItem,
        notification.dismissed && styles.notificationItemDismissed,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${priorityColor}20` }]}>
        <Icon size={20} color={priorityColor} />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTimeAgo(notification.createdAt)}
          </Text>
        </View>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {notification.body}
        </Text>
        {notification.priority === 'urgent' && !notification.dismissed && (
          <View style={styles.urgentBadge}>
            <AlertTriangle size={12} color={colors.status.error} />
            <Text style={styles.urgentText}>Urgent</Text>
          </View>
        )}
      </View>

      {!notification.dismissed && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => {
            safeHaptics.impact(ImpactFeedbackStyle.Light);
            onDismiss();
          }}
        >
          <X size={18} color={colors.text.tertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useNotificationStore((state) => state.notifications);
  const dismissNotification = useNotificationStore((state) => state.dismissNotification);
  const clearAll = useNotificationStore((state) => state.clearAll);

  const activeNotifications = notifications.filter((n) => !n.dismissed);
  const dismissedNotifications = notifications.filter((n) => n.dismissed);

  const handleClearAll = () => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    clearAll();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              safeHaptics.impact(ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
              <Trash2 size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
          {notifications.length === 0 && <View style={styles.headerSpacer} />}
        </View>

        {/* Content */}
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyDescription}>
              You'll see alerts about last trains, place closings, weather changes, and more here.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Notifications */}
            {activeNotifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active</Text>
                {activeNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onDismiss={() => dismissNotification(notification.id)}
                  />
                ))}
              </View>
            )}

            {/* Dismissed Notifications */}
            {dismissedNotifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dismissed</Text>
                {dismissedNotifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onDismiss={() => {}}
                  />
                ))}
              </View>
            )}
          </ScrollView>
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
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  notificationItemDismissed: {
    opacity: 0.6,
    backgroundColor: colors.background.tertiary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notificationTitle: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  notificationTime: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },
  notificationBody: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  urgentText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.status.error,
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
  },
});
