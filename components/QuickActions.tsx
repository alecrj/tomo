import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, DollarSign, Star } from 'lucide-react-native';
import { typography, spacing, colors, borders, shadows, getTextColors, TimeOfDay } from '../constants/theme';

interface QuickActionsProps {
  timeOfDay: TimeOfDay;
  onCamera?: () => void;
  onAddExpense?: () => void;
  onStamps?: () => void;
}

export function QuickActions({ timeOfDay, onCamera, onAddExpense, onStamps }: QuickActionsProps) {
  const textColors = getTextColors(timeOfDay);

  const actions = [
    {
      icon: Camera,
      label: 'Scan',
      onPress: onCamera,
    },
    {
      icon: DollarSign,
      label: 'Expense',
      onPress: onAddExpense,
    },
    {
      icon: Star,
      label: 'Stamps',
      onPress: onStamps,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: textColors.secondary }]}>QUICK ACTIONS</Text>
      <View style={styles.actionsRow}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.action, shadows.sm]}
            activeOpacity={0.7}
            onPress={action.onPress}
          >
            <View style={styles.iconContainer}>
              <action.icon
                size={24}
                color={colors.text.light.primary}
                strokeWidth={2}
              />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  label: {
    ...typography.presets.sectionLabel,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  action: {
    flex: 1,
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: colors.interactive.secondary,
    borderRadius: borders.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
});

export default QuickActions;
