import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { colors, spacing, typography } from '../constants/theme';
import { useOfflineStore } from '../stores/useOfflineStore';

export function OfflineBanner() {
  const isOnline = useOfflineStore((state) => state.isOnline);
  const messageQueue = useOfflineStore((state) => state.messageQueue);
  const [slideAnim] = useState(new Animated.Value(-60));
  const [isVisible, setIsVisible] = useState(false);

  // Network listener is initialized in BackgroundTriggers (app/_layout.tsx)
  // No need to initialize it here - that would create duplicate intervals

  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [isOnline]);

  if (!isVisible && isOnline) return null;

  const queueCount = messageQueue.length;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <WifiOff size={16} color={colors.status.warning} />
        <Text style={styles.text}>
          You're offline
          {queueCount > 0 && ` • ${queueCount} message${queueCount > 1 ? 's' : ''} queued`}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: colors.status.warningMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.status.warning,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  text: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.status.warning,
  },
});
