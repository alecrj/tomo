import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, spacing, borders } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 4, style }: SkeletonProps) {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Pre-built skeleton layouts
export function PlaceCardSkeleton() {
  return (
    <View style={styles.placeCard}>
      <Skeleton width="100%" height={160} borderRadius={borders.radius.lg} />
      <View style={styles.placeCardContent}>
        <Skeleton width="80%" height={18} style={styles.mb8} />
        <Skeleton width="60%" height={14} style={styles.mb8} />
        <View style={styles.row}>
          <Skeleton width={60} height={24} borderRadius={borders.radius.full} />
          <Skeleton width={80} height={24} borderRadius={borders.radius.full} />
        </View>
      </View>
    </View>
  );
}

export function MessageSkeleton() {
  return (
    <View style={styles.message}>
      <Skeleton width="90%" height={16} style={styles.mb8} />
      <Skeleton width="75%" height={16} style={styles.mb8} />
      <Skeleton width="60%" height={16} />
    </View>
  );
}

export function ActivityCardSkeleton() {
  return (
    <View style={styles.activityCard}>
      <View style={styles.activityRow}>
        <Skeleton width={60} height={60} borderRadius={borders.radius.md} />
        <View style={styles.activityContent}>
          <Skeleton width="70%" height={16} style={styles.mb8} />
          <Skeleton width="50%" height={14} />
        </View>
      </View>
    </View>
  );
}

export function MapPlaceSkeleton() {
  return (
    <View style={styles.mapPlace}>
      <Skeleton width={80} height={80} borderRadius={borders.radius.md} />
      <View style={styles.mapPlaceContent}>
        <Skeleton width="80%" height={18} style={styles.mb8} />
        <Skeleton width="60%" height={14} style={styles.mb8} />
        <Skeleton width="40%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.background.tertiary,
  },
  placeCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.xl,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  placeCardContent: {
    padding: spacing.lg,
  },
  message: {
    marginVertical: spacing.md,
  },
  activityCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  mapPlace: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  mapPlaceContent: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  mb8: {
    marginBottom: spacing.sm,
  },
});
