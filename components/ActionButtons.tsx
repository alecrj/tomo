import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Navigation, RefreshCw, Image, Receipt, Map } from 'lucide-react-native';
import { colors, spacing } from '../constants/theme';
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
    default:
      return null;
  }
};

export function ActionButtons({ actions, onAction }: ActionButtonsProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <View style={styles.container}>
      {actions.map((action, index) => {
        const Icon = getActionIcon(action.type);
        const isPrimary = index === 0;

        return (
          <TouchableOpacity
            key={`${action.type}-${index}`}
            style={[styles.button, isPrimary ? styles.primaryButton : styles.secondaryButton]}
            onPress={() => onAction(action)}
          >
            {Icon && (
              <Icon
                size={16}
                color={isPrimary ? '#FFFFFF' : '#007AFF'}
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
    borderRadius: 20,
    gap: spacing.xs,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#F2F2F7',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#007AFF',
  },
});
