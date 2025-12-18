import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Plus } from 'lucide-react-native';
import { colors, spacing, borders, typography } from '../constants/theme';
import { useItineraryStore } from '../stores/useItineraryStore';
import { useLocationStore } from '../stores/useLocationStore';

export default function ItineraryScreen() {
  const router = useRouter();
  const getActiveItinerary = useItineraryStore((state) => state.getActiveItinerary);
  const activeItinerary = getActiveItinerary();
  const neighborhood = useLocationStore((state) => state.neighborhood);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Itinerary</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          {activeItinerary ? (
            <View style={styles.itineraryContainer}>
              <Text style={styles.itineraryName}>{activeItinerary.name}</Text>
              {/* TODO: Display days and activities */}
              <Text style={styles.comingSoonText}>
                Itinerary details coming soon...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Calendar size={64} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No Itinerary Yet</Text>
              <Text style={styles.emptyDescription}>
                Ask Tomo to plan your trip! Try saying:{'\n'}
                "Plan my next 3 days in {neighborhood || 'this city'}"
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/')}
              >
                <Plus size={20} color={colors.text.inverse} />
                <Text style={styles.createButtonText}>Ask Tomo to Plan</Text>
              </TouchableOpacity>
            </View>
          )}
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
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  itineraryContainer: {
    flex: 1,
  },
  itineraryName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  comingSoonText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
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
});
