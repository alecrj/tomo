import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { colors, spacing, typography } from '../constants/theme';

/**
 * Navigation Screen - DISABLED FOR EXPO GO
 * Requires react-native-maps (native module)
 * Will be enabled in native build
 */
export default function NavigationScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={colors.text.light.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Navigation</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Placeholder Content */}
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderTitle}>Maps Disabled</Text>
          <Text style={styles.placeholderText}>
            Navigation with maps requires a native build.
          </Text>
          <Text style={styles.placeholderText}>
            Currently testing core features with Expo Go.
          </Text>
          <Text style={styles.placeholderSubtext}>
            Maps will be re-enabled in the native build.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.light.primary,
  },
  placeholder: {
    width: 40,
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  placeholderTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.text.light.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: typography.sizes.base,
    color: colors.text.light.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  placeholderSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.text.light.tertiary,
    marginTop: spacing.xl,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
