import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
} from 'lucide-react-native';
import { colors, spacing, typography, borders, shadows } from '../constants/theme';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useLocationStore } from '../stores/useLocationStore';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from '../utils/haptics';
import { detectCurrency, formatCurrency } from '../utils/currency';
import type { Expense } from '../types';

// Category data with colors and emojis
const CATEGORIES = {
  food: { label: 'Food', emoji: '🍜', color: '#FF6B6B' },
  transport: { label: 'Transport', emoji: '🚇', color: '#4ECDC4' },
  shopping: { label: 'Shopping', emoji: '🛍️', color: '#45B7D1' },
  activity: { label: 'Activity', emoji: '🎭', color: '#96CEB4' },
  other: { label: 'Other', emoji: '💰', color: '#DDA0DD' },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

export default function ExpensesScreen() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);

  // Budget store
  const dailyBudget = useBudgetStore((state) => state.dailyBudget);
  const tripTotal = useBudgetStore((state) => state.tripTotal);
  const expenses = useBudgetStore((state) => state.expenses);
  const removeExpense = useBudgetStore((state) => state.removeExpense);
  const spentToday = useBudgetStore((state) => state.spentToday());

  // Location for currency
  const coordinates = useLocationStore((state) => state.coordinates);
  const currency = coordinates ? detectCurrency(coordinates) : { code: 'USD', symbol: '$', name: 'US Dollar' };

  // Calculate totals
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Budget percentage
  const budgetPercent = dailyBudget > 0 ? Math.round((spentToday / dailyBudget) * 100) : 0;
  const isOverBudget = budgetPercent > 100;

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<CategoryKey, number> = {
      food: 0,
      transport: 0,
      shopping: 0,
      activity: 0,
      other: 0,
    };

    expenses.forEach((e) => {
      const cat = e.category as CategoryKey;
      if (breakdown[cat] !== undefined) {
        breakdown[cat] += e.amount;
      }
    });

    return Object.entries(breakdown)
      .filter(([, amount]) => amount > 0)
      .map(([category, amount]) => ({
        category: category as CategoryKey,
        amount,
        percent: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalSpent]);

  // Group expenses by day
  const expensesByDay = useMemo(() => {
    const grouped: Record<string, Expense[]> = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.timestamp);
      const dateKey = date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(expense);
    });

    // Sort by date descending
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([dateKey, dayExpenses]) => ({
        date: new Date(dateKey),
        expenses: dayExpenses.sort((a, b) => b.timestamp - a.timestamp),
        total: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
      }));
  }, [expenses]);

  // Format date for display
  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Handle delete expense
  const handleDeleteExpense = (expense: Expense) => {
    safeHaptics.impact(ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Expense',
      `Remove ${currency.symbol}${expense.amount} ${expense.note || CATEGORIES[expense.category as CategoryKey]?.label || 'expense'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeExpense(expense.id);
            safeHaptics.notification(NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
          <Text style={styles.headerTitle}>Expenses</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Budget Overview Card */}
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <Wallet size={20} color={colors.accent.primary} />
              <Text style={styles.budgetTitle}>Today's Budget</Text>
            </View>

            <View style={styles.budgetAmounts}>
              <View style={styles.budgetAmount}>
                <Text style={styles.budgetAmountValue}>
                  {currency.symbol}{spentToday.toLocaleString()}
                </Text>
                <Text style={styles.budgetAmountLabel}>spent</Text>
              </View>
              <View style={styles.budgetDivider} />
              <View style={styles.budgetAmount}>
                <Text style={styles.budgetAmountValue}>
                  {currency.symbol}{dailyBudget.toLocaleString()}
                </Text>
                <Text style={styles.budgetAmountLabel}>budget</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(budgetPercent, 100)}%`,
                    backgroundColor: isOverBudget
                      ? colors.status.error
                      : budgetPercent > 80
                      ? colors.status.warning
                      : colors.status.success,
                  },
                ]}
              />
            </View>

            <View style={styles.budgetStatus}>
              {isOverBudget ? (
                <TrendingDown size={16} color={colors.status.error} />
              ) : (
                <TrendingUp size={16} color={colors.status.success} />
              )}
              <Text
                style={[
                  styles.budgetStatusText,
                  { color: isOverBudget ? colors.status.error : colors.status.success },
                ]}
              >
                {isOverBudget
                  ? `${budgetPercent - 100}% over budget`
                  : `${100 - budgetPercent}% remaining`}
              </Text>
            </View>
          </View>

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>Spending Breakdown</Text>
              <Text style={styles.totalSpent}>
                Total: {currency.symbol}{totalSpent.toLocaleString()}
              </Text>

              <View style={styles.categoryBars}>
                {categoryBreakdown.map(({ category, amount, percent }) => (
                  <View key={category} style={styles.categoryRow}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryEmoji}>
                        {CATEGORIES[category].emoji}
                      </Text>
                      <Text style={styles.categoryLabel}>
                        {CATEGORIES[category].label}
                      </Text>
                    </View>
                    <View style={styles.categoryBarContainer}>
                      <View
                        style={[
                          styles.categoryBar,
                          {
                            width: `${percent}%`,
                            backgroundColor: CATEGORIES[category].color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.categoryAmount}>
                      {currency.symbol}{amount.toLocaleString()}
                    </Text>
                    <Text style={styles.categoryPercent}>{percent}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Expense List */}
          {expensesByDay.length > 0 ? (
            <View style={styles.expensesList}>
              <Text style={styles.sectionTitle}>All Expenses</Text>

              {expensesByDay.map(({ date, expenses: dayExpenses, total }) => (
                <View key={date.toISOString()} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <Calendar size={14} color={colors.text.secondary} />
                      <Text style={styles.dayLabel}>{formatDate(date)}</Text>
                    </View>
                    <Text style={styles.dayTotal}>
                      {currency.symbol}{total.toLocaleString()}
                    </Text>
                  </View>

                  {dayExpenses.map((expense) => (
                    <View key={expense.id} style={styles.expenseItem}>
                      <View style={styles.expenseLeft}>
                        <Text style={styles.expenseEmoji}>
                          {CATEGORIES[expense.category as CategoryKey]?.emoji || '💰'}
                        </Text>
                        <View style={styles.expenseDetails}>
                          <Text style={styles.expenseNote}>
                            {expense.note ||
                              CATEGORIES[expense.category as CategoryKey]?.label ||
                              'Expense'}
                          </Text>
                          <Text style={styles.expenseTime}>
                            {formatTime(expense.timestamp)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.expenseRight}>
                        <Text style={styles.expenseAmount}>
                          {currency.symbol}{expense.amount.toLocaleString()}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteExpense(expense)}
                        >
                          <Trash2 size={16} color={colors.text.tertiary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💸</Text>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to log your spending
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            safeHaptics.impact(ImpactFeedbackStyle.Medium);
            setShowAddModal(true);
          }}
        >
          <Plus size={28} color={colors.text.inverse} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
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
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // Budget Card
  budgetCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  budgetTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  budgetAmount: {
    flex: 1,
    alignItems: 'center',
  },
  budgetAmountValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  budgetAmountLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  budgetDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.default,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.budget.track,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-end',
  },
  budgetStatusText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  // Category Breakdown
  breakdownCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  totalSpent: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  categoryBars: {
    gap: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    gap: spacing.xs,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
  },
  categoryBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: 4,
  },
  categoryAmount: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    width: 60,
    textAlign: 'right',
  },
  categoryPercent: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    width: 35,
    textAlign: 'right',
  },

  // Expense List
  expensesList: {
    marginBottom: spacing.lg,
  },
  dayGroup: {
    marginBottom: spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dayLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  dayTotal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  expenseEmoji: {
    fontSize: 24,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseNote: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  expenseTime: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  expenseAmount: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
