import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, spacing, colors, borders, getTextColors, TimeOfDay, isLightBackground } from '../constants/theme';
import { useBudgetStore } from '../stores/useBudgetStore';

interface BudgetBarProps {
  timeOfDay: TimeOfDay;
}

export function BudgetBar({ timeOfDay }: BudgetBarProps) {
  const dailyBudget = useBudgetStore((state) => state.dailyBudget);
  const spentToday = useBudgetStore((state) => state.spentToday());
  const remainingToday = useBudgetStore((state) => state.remainingToday());

  const textColors = getTextColors(timeOfDay);
  const isLight = isLightBackground(timeOfDay);

  const percentage = dailyBudget > 0 ? Math.min((spentToday / dailyBudget) * 100, 100) : 0;
  const remaining = Math.max(remainingToday, 0);

  const getStatusColor = () => {
    if (percentage <= 80) return colors.budget.onTrack;
    if (percentage <= 100) return colors.budget.warning;
    return colors.budget.over;
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: textColors.secondary }]}>TODAY'S BUDGET</Text>
        <Text style={[styles.amount, { color: textColors.primary }]}>
          {formatCurrency(spentToday)} / {formatCurrency(dailyBudget)}
        </Text>
      </View>

      <View style={[styles.trackContainer, { backgroundColor: colors.budget.trackBg }]}>
        <View
          style={[
            styles.progress,
            {
              width: `${percentage}%`,
              backgroundColor: getStatusColor(),
            },
          ]}
        />
      </View>

      <Text style={[styles.remaining, { color: textColors.secondary }]}>
        {formatCurrency(remaining)} remaining
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.presets.sectionLabel,
  },
  amount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  trackContainer: {
    height: 8,
    borderRadius: borders.radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progress: {
    height: '100%',
    borderRadius: borders.radius.full,
  },
  remaining: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
});

export default BudgetBar;
