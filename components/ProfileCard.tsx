import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Sparkles } from 'lucide-react-native';
import { colors, spacing, typography, borders, shadows } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface ProfileCardProps {
  name?: string;
  title?: string;
  handle?: string;
  status?: string;
  avatarUrl?: string;
  location?: string;
  tripDay?: number;
  placesVisited?: number;
  onPress?: () => void;
  enableTilt?: boolean;
}

export function ProfileCard({
  name = 'Traveler',
  title = 'Explorer',
  handle = 'adventurer',
  status = 'On a journey',
  avatarUrl,
  location = 'Exploring the world',
  tripDay = 1,
  placesVisited = 0,
  onPress,
  enableTilt = true,
}: ProfileCardProps) {
  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <View style={styles.container}>
      {/* Glow effect behind card */}
      <View style={styles.glow} />

      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={handlePress}
          style={styles.touchable}
        >
          {/* Background gradient */}
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.backgroundGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Inner gradient overlay */}
          <LinearGradient
            colors={['rgba(249, 115, 22, 0.15)', 'rgba(113, 196, 255, 0.1)', 'transparent']}
            style={styles.innerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {/* Content */}
          <View style={styles.content}>
            {/* Top - Name and Title */}
            <View style={styles.topSection}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.title}>{title}</Text>
            </View>

            {/* Avatar - Positioned at bottom, overlapping */}
            <View style={styles.avatarSection}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* Bottom info bar - glassmorphism */}
            <View style={styles.infoBar}>
              <View style={styles.infoBarBackground} />
              <View style={styles.infoBarContent}>
                <View style={styles.userInfo}>
                  <View style={styles.miniAvatarContainer}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.miniAvatar} />
                    ) : (
                      <View style={styles.miniAvatarPlaceholder}>
                        <MapPin size={16} color={colors.accent.primary} />
                      </View>
                    )}
                  </View>
                  <View style={styles.userTextContainer}>
                    <Text style={styles.handle}>@{handle}</Text>
                    <Text style={styles.status}>{status}</Text>
                  </View>
                </View>
                <View style={styles.statsContainer}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{tripDay}</Text>
                    <Text style={styles.statLabel}>Day</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{placesVisited}</Text>
                    <Text style={styles.statLabel}>Places</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Location badge */}
            <View style={styles.locationBadge}>
              <Sparkles size={12} color={colors.accent.primary} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          </View>

          {/* Border glow */}
          <View style={styles.borderGlow} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: 'center',
  },
  glow: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius['2xl'],
    opacity: 0.3,
    ...shadows.glow,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: borders.radius['2xl'],
    overflow: 'hidden',
    ...shadows.xl,
  },
  touchable: {
    flex: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  innerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  topSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  name: {
    fontSize: 36,
    fontWeight: typography.weights.bold,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  avatarSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 80,
  },
  avatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 72,
    fontWeight: typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoBar: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borders.radius.xl,
    overflow: 'hidden',
  },
  infoBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  miniAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatar: {
    width: '100%',
    height: '100%',
  },
  miniAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextContainer: {
    gap: 2,
  },
  handle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  status: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: '#fff',
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borders.radius.full,
  },
  locationText: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: typography.weights.medium,
  },
  borderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borders.radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
});
