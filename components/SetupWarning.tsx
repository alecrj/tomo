import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AlertTriangle, AlertCircle } from 'lucide-react-native';
import { colors, spacing, typography } from '../constants/theme';
import type { SetupIssue } from '../utils/setupCheck';

interface SetupWarningProps {
  issues: SetupIssue[];
}

export function SetupWarning({ issues }: SetupWarningProps) {
  if (issues.length === 0) return null;

  const errors = issues.filter((issue) => issue.type === 'error');
  const warnings = issues.filter((issue) => issue.type === 'warning');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {errors.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AlertCircle size={24} color={colors.status.error} />
              <Text style={styles.sectionTitle}>Setup Required</Text>
            </View>
            <Text style={styles.sectionDescription}>
              The app cannot function without these:
            </Text>

            {errors.map((issue, index) => (
              <View key={index} style={[styles.issueCard, styles.errorCard]}>
                <Text style={styles.issueTitle}>{issue.title}</Text>
                <Text style={styles.issueMessage}>{issue.message}</Text>
                {issue.fix && (
                  <View style={styles.fixContainer}>
                    <Text style={styles.fixLabel}>Fix:</Text>
                    <Text style={styles.fixText}>{issue.fix}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {warnings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={24} color={colors.status.warning} />
              <Text style={styles.sectionTitle}>Warnings</Text>
            </View>
            <Text style={styles.sectionDescription}>
              The app will work but with limited functionality:
            </Text>

            {warnings.map((issue, index) => (
              <View key={index} style={[styles.issueCard, styles.warningCard]}>
                <Text style={styles.issueTitle}>{issue.title}</Text>
                <Text style={styles.issueMessage}>{issue.message}</Text>
                {issue.fix && (
                  <View style={styles.fixContainer}>
                    <Text style={styles.fixLabel}>Fix:</Text>
                    <Text style={styles.fixText}>{issue.fix}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
  },
  scrollView: {
    maxHeight: 400,
  },
  content: {
    paddingBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginLeft: spacing.sm,
  },
  sectionDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  issueCard: {
    padding: spacing.lg,
    borderRadius: 8,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
  },
  errorCard: {
    backgroundColor: colors.status.errorLight,
    borderLeftColor: colors.status.error,
  },
  warningCard: {
    backgroundColor: colors.status.warningLight,
    borderLeftColor: colors.status.warning,
  },
  issueTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginBottom: spacing.xs,
  },
  issueMessage: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.secondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  fixContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  fixLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
    marginBottom: 4,
  },
  fixText: {
    fontSize: typography.sizes.xs,
    fontFamily: 'monospace',
    color: colors.text.light.secondary,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: spacing.sm,
    borderRadius: 4,
  },
});
