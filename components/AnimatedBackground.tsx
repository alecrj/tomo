import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getBackgroundColors, TimeOfDay, WeatherCondition } from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface AnimatedBackgroundProps {
  timeOfDay: TimeOfDay;
  weatherCondition?: WeatherCondition | null;
}

export function AnimatedBackground({ timeOfDay, weatherCondition }: AnimatedBackgroundProps) {
  const weather = weatherCondition || undefined;
  const colors = getBackgroundColors(timeOfDay, weather) as unknown as readonly [string, string, ...string[]];

  const breathe = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ])
    );

    const driftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 15000,
          useNativeDriver: true,
        }),
      ])
    );

    breatheAnimation.start();
    driftAnimation.start();

    return () => {
      breatheAnimation.stop();
      driftAnimation.stop();
    };
  }, []);

  const layer1Scale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const layer1Opacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.6],
  });

  const layer2TranslateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  const layer2TranslateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -10],
  });

  const layer2Opacity = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.5],
  });

  const layer3TranslateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [15, -15],
  });

  const layer3TranslateY = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [-15, 5],
  });

  const layer3Opacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.35],
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={colors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View
        style={[
          styles.glowLayer,
          styles.topGlow,
          {
            transform: [{ scale: layer1Scale }],
            opacity: layer1Opacity,
          },
        ]}
      >
        <LinearGradient
          colors={[colors[0], 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.glowLayer,
          styles.middleGlow,
          {
            transform: [{ translateX: layer2TranslateX }, { translateY: layer2TranslateY }],
            opacity: layer2Opacity,
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', colors[1], 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.glowLayer,
          styles.bottomGlow,
          {
            transform: [{ translateX: layer3TranslateX }, { translateY: layer3TranslateY }],
            opacity: layer3Opacity,
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', colors[2] || colors[1]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topGlow: {
    top: -height * 0.2,
    height: height * 0.7,
  },
  middleGlow: {
    top: height * 0.2,
    height: height * 0.6,
  },
  bottomGlow: {
    top: height * 0.4,
    height: height * 0.7,
  },
});

export default AnimatedBackground;
