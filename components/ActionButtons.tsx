import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Navigation, RefreshCw, Image, Receipt, Map, CalendarPlus, Bookmark } from 'lucide-react-native';
import { safeHaptics, ImpactFeedbackStyle } from '../utils/haptics';
import { colors, spacing, borders } from '../constants/theme';
import type { MessageAction, MessageActionType } from '../types';

interface ActionButtonsProps {
  actions: MessageAction[];
  onAction: (action: MessageAction) => void;
}

const getActionIcon = (type: MessageActionType) => {
  switch (type) {
    case 'navigate':
      return Navigation;
    case 'regenerate':
      return RefreshCw;
    case 'show_photos':
      return Image;
    case 'log_expense':
      return Receipt;
    case 'show_recap':
      return Map;
    case 'add_to_itinerary':
      return CalendarPlus;
    case 'save_for_later':
      return Bookmark;
    default:
      return null;
  }
};

export function ActionButtons({ actions, onAction }: ActionButtonsProps) {
  if (!actions || actions.length === 0) return null;

  const handleAction = (action: MessageAction) => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    onAction(action);
  };

  return (
    <View style={styles.container}>
      {actions.map((action, index) => {
        const Icon = getActionIcon(action.type);
        const isPrimary = index === 0;

        return (
          <TouchableOpacity
            key={`${action.type}-${index}`}
            style={[styles.button, isPrimary ? styles.primaryButton : styles.secondaryButton]}
            onPress={() => handleAction(action)}
          >
            {Icon && (
              <Icon
                size={16}
                color={isPrimary ? colors.text.inverse : colors.accent.primary}
              />
            )}
            <Text style={[styles.buttonText, isPrimary ? styles.primaryText : styles.secondaryText]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.full,
    gap: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.accent.primary,
  },
  secondaryButton: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryText: {
    color: colors.text.inverse,
  },
  secondaryText: {
    color: colors.accent.primary,
  },
});
