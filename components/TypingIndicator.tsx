import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, spacing, borders } from '../constants/theme';

interface TypingIndicatorProps {
  size?: 'small' | 'medium';
}

export function TypingIndicator({ size = 'medium' }: TypingIndicatorProps) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const dotSize = size === 'small' ? 6 : 8;
  const bubblePadding = size === 'small' ? spacing.sm : spacing.md;

  useEffect(() => {
    const createBounce = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      createBounce(dot1, 0),
      createBounce(dot2, 150),
      createBounce(dot3, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, [dot1, dot2, dot3]);

  const getTranslateY = (dot: Animated.Value) => {
    return dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -6],
    });
  };

  const getOpacity = (dot: Animated.Value) => {
    return dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    });
  };

  return (
    <View style={[styles.container, { padding: bubblePadding }]}>
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              transform: [{ translateY: getTranslateY(dot1) }],
              opacity: getOpacity(dot1),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              transform: [{ translateY: getTranslateY(dot2) }],
              opacity: getOpacity(dot2),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              transform: [{ translateY: getTranslateY(dot3) }],
              opacity: getOpacity(dot3),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.chat.assistantBubble,
    borderRadius: borders.radius.xl,
    borderBottomLeftRadius: borders.radius.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 20,
    paddingHorizontal: spacing.xs,
  },
  dot: {
    backgroundColor: colors.text.secondary,
  },
});
