/**
 * Safe haptics wrapper
 * Native module may not be available in all dev builds
 * Uses .catch() to properly handle promise rejections
 */
import * as Haptics from 'expo-haptics';

export const safeHaptics = {
  impact: (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    Haptics.impactAsync(style).catch(() => {});
  },
  notification: (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
    Haptics.notificationAsync(type).catch(() => {});
  },
  selection: () => {
    Haptics.selectionAsync().catch(() => {});
  },
};

// Re-export types for convenience
export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
