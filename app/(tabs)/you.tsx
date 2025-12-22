import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// Animations disabled temporarily for stability
// import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Wallet,
  Settings,
  ChevronRight,
  BarChart3,
  Mic,
  HelpCircle,
} from 'lucide-react-native';
import { colors, spacing, typography, borders } from '../../constants/theme';
import { useTripStore } from '../../stores/useTripStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { safeHaptics, ImpactFeedbackStyle } from '../../utils/haptics';
import { ProfileCard } from '../../components/ProfileCard';

export default function YouScreen() {
  const router = useRouter();

  // Store state - use proper selectors to avoid re-render loops
  const currentTrip = useTripStore((state) => state.currentTrip);
  const visits = useTripStore((state) => state.visits);
  // Get budget data with proper selectors
  const dailyBudget = useBudgetStore((state) => state.dailyBudget);
  const expenses = useBudgetStore((state) => state.expenses);
  // Compute spentToday in useMemo instead of calling store method
  const spentToday = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return expenses
      .filter((e) => e.timestamp >= todayStart.getTime() && e.timestamp <= todayEnd.getTime())
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const userName = usePreferencesStore((state) => state.userName);

  // Trip day calculation
  const tripDay = useMemo(() => {
    if (!currentTrip?.startDate) return 1;
    return Math.ceil((Date.now() - currentTrip.startDate) / 86400000) || 1;
  }, [currentTrip?.startDate]);

  // Budget percentage
  const budgetPercent = dailyBudget > 0 ? Math.round((spentToday / dailyBudget) * 100) : 0;

  // Navigate to different screens
  const handleNavigate = (route: string) => {
    safeHaptics.impact(ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>You</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => handleNavigate('/settings')}
          >
            <Settings size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium Profile Card */}
          <View>
            <ProfileCard
              name={userName || 'Traveler'}
              title={currentTrip?.name || 'Explorer'}
              handle={userName?.toLowerCase().replace(/\s+/g, '') || 'adventurer'}
              status={neighborhood ? `Exploring ${neighborhood}` : 'On a journey'}
              location={neighborhood || 'Discovering new places'}
              tripDay={tripDay}
              placesVisited={visits.length}
              onPress={() => handleNavigate('/settings')}
              enableTilt={true}
            />
          </View>

          {/* Budget bar - compact version below card */}
          {dailyBudget > 0 && (
            <View style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetLabel}>Today's Budget</Text>
                <Text style={styles.budgetValue}>
                  ${spentToday.toFixed(0)} / ${dailyBudget.toFixed(0)}
                </Text>
              </View>
              <View style={styles.budgetTrack}>
                <View
                  style={[
                    styles.budgetFill,
                    {
                      width: `${Math.min(budgetPercent, 100)}%`,
                      backgroundColor:
                        budgetPercent > 100
                          ? colors.budget.over
                          : budgetPercent > 80
                            ? colors.budget.warning
                            : colors.budget.onTrack,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Menu items */}
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/expenses')}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.status.warningMuted }]}>
                <Wallet size={20} color={colors.status.warning} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Budget & Spending</Text>
                <Text style={styles.menuSubtitle}>Track your travel expenses</Text>
              </View>
              <ChevronRight size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/trip-recap')}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.status.successMuted }]}>
                <BarChart3 size={20} color={colors.status.success} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Trip Stats</Text>
                <Text style={styles.menuSubtitle}>See your journey summary</Text>
              </View>
              <ChevronRight size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/voice')}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.accent.muted }]}>
                <Mic size={20} color={colors.accent.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Voice Mode</Text>
                <Text style={styles.menuSubtitle}>Hands-free conversation</Text>
              </View>
              <ChevronRight size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Settings */}
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('/settings')}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.background.tertiary }]}>
                <Settings size={20} color={colors.text.secondary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Settings</Text>
                <Text style={styles.menuSubtitle}>Preferences & account</Text>
              </View>
              <ChevronRight size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Help */}
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => router.push('/(tabs)')}
          >
            <HelpCircle size={16} color={colors.text.tertiary} />
            <Text style={styles.helpText}>Need help? Ask Tomo anything</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // Budget card
  budgetCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  budgetLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  budgetValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  budgetTrack: {
    height: 8,
    backgroundColor: colors.budget.track,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetPercent: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },

  // Menu
  menuSection: {
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: borders.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  menuSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  badge: {
    backgroundColor: colors.status.error,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.inverse,
  },

  // Help
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  helpText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
});
