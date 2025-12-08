import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Cloud, CloudRain, Sun, CloudSnow, Settings } from 'lucide-react-native';
import { typography, spacing, getTextColors, TimeOfDay, WeatherCondition } from '../constants/theme';

interface HeaderProps {
  timeOfDay: TimeOfDay;
  location?: string;
  weather?: {
    condition: WeatherCondition;
    temperature: number;
  };
  onSettingsPress?: () => void;
}

export function Header({ timeOfDay, location, weather, onSettingsPress }: HeaderProps) {
  const textColors = getTextColors(timeOfDay);

  const getGreeting = () => {
    switch (timeOfDay) {
      case 'morning':
        return 'Good morning';
      case 'afternoon':
        return 'Good afternoon';
      case 'evening':
        return 'Good evening';
      case 'night':
        return 'Good evening';
    }
  };

  const getWeatherIcon = () => {
    if (!weather) return null;

    const iconProps = {
      size: 20,
      color: textColors.primary,
      strokeWidth: 2,
    };

    switch (weather.condition) {
      case 'clear':
        return <Sun {...iconProps} />;
      case 'cloudy':
        return <Cloud {...iconProps} />;
      case 'rain':
        return <CloudRain {...iconProps} />;
      case 'snow':
        return <CloudSnow {...iconProps} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.greetingRow}>
        <Text style={[styles.greeting, { color: textColors.primary }]}>
          {getGreeting()}
          {location && (
            <Text style={[styles.location, { color: textColors.primary }]}>
              , {location}
            </Text>
          )}
        </Text>
        {onSettingsPress && (
          <TouchableOpacity style={styles.settingsButton} onPress={onSettingsPress}>
            <Settings size={24} color={textColors.primary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {weather && (
        <View style={styles.weatherRow}>
          {getWeatherIcon()}
          <Text style={[styles.temperature, { color: textColors.secondary }]}>
            {Math.round(weather.temperature)}°C
          </Text>
          <Text style={[styles.condition, { color: textColors.secondary }]}>
            {weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  greeting: {
    ...typography.presets.greeting,
    flex: 1,
  },
  location: {
    ...typography.presets.greeting,
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  temperature: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  condition: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
  },
});

export default Header;
