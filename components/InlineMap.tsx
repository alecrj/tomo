import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Navigation, MapPin } from 'lucide-react-native';
import { colors, spacing } from '../constants/theme';
import { decodePolyline } from '../utils/polyline';
import type { InlineMapData } from '../types';

interface InlineMapProps {
  mapData: InlineMapData;
  onPress?: () => void;
  showExpandButton?: boolean;
}

/**
 * Inline Map Component
 * Uses react-native-maps for native builds
 */
export function InlineMap({ mapData, onPress, showExpandButton = true }: InlineMapProps) {
  const mapRef = useRef<MapView>(null);

  // Decode route polyline if present
  const routeCoordinates = mapData.route?.polyline
    ? decodePolyline(mapData.route.polyline)
    : [];

  // Fit map to show all markers and route
  useEffect(() => {
    if (mapRef.current && (mapData.markers?.length || routeCoordinates.length)) {
      const allCoords = [
        mapData.center,
        ...(mapData.markers?.map(m => m.coordinate) || []),
        ...routeCoordinates,
      ].filter(Boolean);

      if (allCoords.length > 1) {
        mapRef.current.fitToCoordinates(allCoords, {
          edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
          animated: true,
        });
      }
    }
  }, [mapData, routeCoordinates]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        initialRegion={{
          latitude: mapData.center.latitude,
          longitude: mapData.center.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Center marker or markers */}
        {mapData.markers && mapData.markers.length > 0 ? (
          mapData.markers.map(marker => (
            <Marker
              key={marker.id}
              coordinate={marker.coordinate}
              title={marker.title}
            >
              <View style={styles.markerContainer}>
                <MapPin size={20} color="#FFFFFF" fill="#FF3B30" />
              </View>
            </Marker>
          ))
        ) : (
          <Marker coordinate={mapData.center}>
            <View style={styles.markerContainer}>
              <MapPin size={20} color="#FFFFFF" fill="#FF3B30" />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={4}
          />
        )}
      </MapView>

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

      {/* Gradient overlay for better button visibility */}
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
  markerContainer: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
