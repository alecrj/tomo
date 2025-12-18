import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Train,
  Clock,
  CloudRain,
  Calendar,
  Wallet,
  Bus,
  X,
  Navigation,
  AlertTriangle,
  Info,
  Bell,
} from 'lucide-react-native';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { colors, spacing, borders, typography, shadows } from '../constants/theme';
import { useNotificationStore } from '../stores/useNotificationStore';
import type { Notification, NotificationType, NotificationPriority } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const getPriorityIcon = (priority: NotificationPriority) => {
  switch (priority) {
    case 'urgent':
      return AlertTriangle;
    case 'warning':
      return AlertTriangle;
    case 'info':
    default:
      return Info;
  }
};

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  onAction?: () => void;
}

export function NotificationToast({ notification, onDismiss, onAction }: NotificationToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic based on priority
    if (notification.priority === 'urgent') {
      safeHaptics.notification(NotificationFeedbackType.Error);
    } else if (notification.priority === 'warning') {
      safeHaptics.notification(NotificationFeedbackType.Warning);
    } else {
      safeHaptics.notification(NotificationFeedbackType.Success);
    }

    // Auto-dismiss after 5 seconds for non-urgent
    if (notification.priority !== 'urgent') {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const TypeIcon = getNotificationIcon(notification.type);
  const priorityColor = getPriorityColor(notification.priority);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          borderLeftColor: priorityColor,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${priorityColor}20` }]}>
        <TypeIcon size={20} color={priorityColor} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
      </View>

      <View style={styles.actions}>
        {notification.action && onAction && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: priorityColor }]}
            onPress={() => {
              safeHaptics.impact(ImpactFeedbackStyle.Medium);
              onAction();
            }}
          >
            <Navigation size={14} color={colors.text.inverse} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => {
            safeHaptics.impact(ImpactFeedbackStyle.Light);
            handleDismiss();
          }}
        >
          <X size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Container component that shows active notifications
export function NotificationContainer() {
  const notifications = useNotificationStore((state) => state.getActiveNotifications());
  const dismissNotification = useNotificationStore((state) => state.dismissNotification);

  // Only show the most recent urgent or first notification
  const urgentNotifications = notifications.filter((n) => n.priority === 'urgent');
  const notificationToShow = urgentNotifications[0] || notifications[0];

  if (!notificationToShow) return null;

  return (
    <View style={styles.toastContainer}>
      <NotificationToast
        key={notificationToShow.id}
        notification={notificationToShow}
        onDismiss={() => dismissNotification(notificationToShow.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    ...shadows.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  body: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: borders.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
