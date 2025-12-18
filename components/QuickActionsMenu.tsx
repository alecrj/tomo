import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Utensils,
  Coffee,
  Beer,
  Landmark,
  Camera,
  CalendarDays,
  Wallet,
  Home,
  Sun,
  Moon,
  CloudRain,
  MapPin,
  Shuffle,
  Languages,
} from 'lucide-react-native';
import { colors, spacing, borders, shadows, typography } from '../constants/theme';
import type { TimeOfDay, WeatherCondition } from '../types';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  message: string;
}

interface QuickActionsMenuProps {
  visible: boolean;
  timeOfDay: TimeOfDay;
  weather?: WeatherCondition;
  isNavigating?: boolean;
  onSelectAction: (message: string) => void;
  onClose: () => void;
}

// Default actions that are always available
const defaultActions: QuickAction[] = [
  { id: 'food', label: 'Food', icon: Utensils, message: 'Find me somewhere good to eat nearby' },
  { id: 'coffee', label: 'Coffee', icon: Coffee, message: 'Where can I get a good coffee nearby?' },
  { id: 'drinks', label: 'Drinks', icon: Beer, message: 'Find me a good bar or place for drinks nearby' },
  { id: 'sights', label: 'Sights', icon: Landmark, message: "What's interesting to see around here?" },
  { id: 'photo', label: 'Photo', icon: Camera, message: 'Where are the best photo spots nearby?' },
  { id: 'translate', label: 'Translate', icon: Languages, message: 'Help me translate something' },
  { id: 'plan', label: 'Plan', icon: CalendarDays, message: 'Help me plan my day' },
  { id: 'budget', label: 'Budget', icon: Wallet, message: "How's my budget looking today?" },
  { id: 'home', label: 'Home', icon: Home, message: 'Take me home' },
];

// Time-based actions
const morningActions: QuickAction[] = [
  { id: 'breakfast', label: 'Breakfast', icon: Utensils, message: 'Find me a good breakfast spot nearby' },
  { id: 'coffee', label: 'Coffee', icon: Coffee, message: 'Where can I get a good morning coffee?' },
];

const afternoonActions: QuickAction[] = [
  { id: 'lunch', label: 'Lunch', icon: Utensils, message: 'Find me somewhere good for lunch' },
];

const eveningActions: QuickAction[] = [
  { id: 'dinner', label: 'Dinner', icon: Utensils, message: 'Find me a good dinner spot nearby' },
  { id: 'nightlife', label: 'Nightlife', icon: Moon, message: "What's the nightlife like around here?" },
];

// Weather-based actions
const rainyActions: QuickAction[] = [
  { id: 'indoor', label: 'Indoor', icon: CloudRain, message: 'What indoor activities can I do nearby?' },
];

// Navigation actions
const navigationActions: QuickAction[] = [
  { id: 'pitstop', label: 'Pit Stop', icon: MapPin, message: 'Find me a quick pit stop along the way' },
  { id: 'change', label: 'Change', icon: Shuffle, message: 'Actually, show me something else' },
];

function getContextualActions(
  timeOfDay: TimeOfDay,
  weather?: WeatherCondition,
  isNavigating?: boolean
): QuickAction[] {
  let actions: QuickAction[] = [];

  // Time-based replacements
  if (timeOfDay === 'morning') {
    actions = [...morningActions];
  } else if (timeOfDay === 'afternoon') {
    actions = [...afternoonActions, defaultActions[1]]; // Add coffee
  } else if (timeOfDay === 'evening' || timeOfDay === 'night') {
    actions = [...eveningActions];
  } else {
    actions = [defaultActions[0], defaultActions[1]]; // Default food + coffee
  }

  // Add drinks for afternoon/evening
  if (timeOfDay === 'afternoon' || timeOfDay === 'evening' || timeOfDay === 'night') {
    actions.push(defaultActions[2]); // drinks
  }

  // Always add sights and photo spots
  actions.push(defaultActions[3]); // sights
  actions.push(defaultActions[4]); // photo

  // Weather-based additions
  if (weather === 'rain') {
    actions.unshift(rainyActions[0]); // Indoor activities first when raining
  }

  // Navigation mode replacements
  if (isNavigating) {
    // Replace some actions with navigation-specific ones
    actions = [
      navigationActions[0], // pit stop
      navigationActions[1], // change route
      ...actions.slice(0, 4),
    ];
  }

  // Always have translate, plan and budget
  actions.push(defaultActions[5]); // translate
  actions.push(defaultActions[6]); // plan
  actions.push(defaultActions[7]); // budget

  // Always have home
  actions.push(defaultActions[8]); // home

  // Remove duplicates by id
  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  });
}

export function QuickActionsMenu({
  visible,
  timeOfDay,
  weather,
  isNavigating,
  onSelectAction,
  onClose,
}: QuickActionsMenuProps) {
  if (!visible) return null;

  const actions = getContextualActions(timeOfDay, weather, isNavigating);

  const handleActionPress = (action: QuickAction) => {
    onSelectAction(action.message);
    onClose();
  };

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Quick Actions</Text>
          <Text style={styles.subtitle}>Tap to ask Tomo</Text>
        </View>
        <View style={styles.chipsContainer}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.chip}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.7}
            >
              <action.icon size={16} color={colors.accent.primary} />
              <Text style={styles.chipLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borders.radius.xl,
    borderTopRightRadius: borders.radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    ...shadows.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface.card,
    borderRadius: borders.radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  chipLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
});

export default QuickActionsMenu;
