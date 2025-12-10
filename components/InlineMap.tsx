import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { Navigation, MapPin } from 'lucide-react-native';
import { colors, spacing } from '../constants/theme';
import { config } from '../constants/config';
import type { InlineMapData } from '../types';

interface InlineMapProps {
  mapData: InlineMapData;
  onPress?: () => void;
  showExpandButton?: boolean;
}

/**
 * Inline Map Component
 * Uses Google Static Maps API for Expo Go compatibility
 */
export function InlineMap({ mapData, onPress, showExpandButton = true }: InlineMapProps) {
  // Build Google Static Maps URL
  const buildStaticMapUrl = () => {
    const { center, markers, route } = mapData;
    const apiKey = config.googlePlacesApiKey;

    let url = `https://maps.googleapis.com/maps/api/staticmap?`;
    url += `center=${center.latitude},${center.longitude}`;
    url += `&zoom=15`;
    url += `&size=600x300`;
    url += `&scale=2`; // Retina
    url += `&maptype=roadmap`;

    // Add markers
    if (markers && markers.length > 0) {
      markers.forEach(marker => {
        url += `&markers=color:red%7C${marker.coordinate.latitude},${marker.coordinate.longitude}`;
      });
    } else {
      // Default marker at center
      url += `&markers=color:red%7C${center.latitude},${center.longitude}`;
    }

    // Add route polyline if present
    if (route?.polyline) {
      url += `&path=color:0x007AFF%7Cweight:4%7Cenc:${encodeURIComponent(route.polyline)}`;
    }

    url += `&key=${apiKey}`;

    return url;
  };

  const handleOpenInMaps = () => {
    const { center } = mapData;
    const url = `https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`;
    Linking.openURL(url);
  };

  const staticMapUrl = buildStaticMapUrl();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress || handleOpenInMaps}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: staticMapUrl }}
        style={styles.map}
        resizeMode="cover"
      />

      {showExpandButton && (
        <View style={styles.expandButton}>
          <Navigation size={16} color="#007AFF" />
          <Text style={styles.expandText}>
            {mapData.route
              ? `${mapData.route.duration} • ${mapData.route.distance}`
              : 'Tap to navigate'}
          </Text>
        </View>
      )}

      {/* Overlay gradient for better button visibility */}
      <View style={styles.gradient} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: spacing.sm,
    backgroundColor: '#E5E7EB',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  expandButton: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
  },
});
