import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import {
  MessageCircle,
  MapPin,
  Heart,
  User,
} from 'lucide-react-native';
import { colors, spacing } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * TOMO - Simplified 4-Tab Navigation
 *
 * Home (Chat) - The soul of the app. Ask anything, get one confident answer.
 * Map - Browse and explore nearby places with Google Maps.
 * Saved - Your saved places collection.
 * You - Settings, preferences, trip history.
 *
 * Plan tab REMOVED - itineraries are now created via chat ("plan my day")
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.primary,
          borderTopColor: colors.border.muted,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: spacing.sm,
        },
        tabBarActiveTintColor: colors.text.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <MapPin size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <Heart size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
      {/* Plan tab hidden - itineraries created via chat */}
      <Tabs.Screen
        name="plan"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
