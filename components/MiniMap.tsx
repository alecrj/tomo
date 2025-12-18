import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { MapPin, Navigation, Maximize2 } from 'lucide-react-native';
import { colors, spacing, borders, shadows, mapStyle } from '../constants/theme';
import { useLocationStore } from '../stores/useLocationStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { decodePolyline } from '../utils/polyline';
import type { Coordinates } from '../types';

// Use Google Maps everywhere for better international coverage
const MAP_PROVIDER = PROVIDER_GOOGLE;

interface MiniMapProps {
  onExpand?: () => void;
  size?: 'small' | 'medium';
}

export function MiniMap({ onExpand, size = 'small' }: MiniMapProps) {
  const mapRef = useRef<MapView>(null);

  const coordinates = useLocationStore((state) => state.coordinates);
  const currentDestination = useNavigationStore((state) => state.currentDestination);
  const currentRoute = useNavigationStore((state) => state.currentRoute);

  const isNavigating = !!currentDestination;
  const routeCoordinates = currentRoute?.polyline
    ? decodePolyline(currentRoute.polyline)
    : [];

  const mapSize = size === 'small' ? 56 : 100;

  // Fit map to show route when navigating
  useEffect(() => {
    if (mapRef.current && coordinates) {
      if (isNavigating && routeCoordinates.length > 0 && currentDestination) {
        const allCoords: Coordinates[] = [
          coordinates,
          ...routeCoordinates,
          currentDestination.coordinates,
        ];

        setTimeout(() => {
          mapRef.current?.fitToCoordinates(allCoords, {
            edgePadding: { top: 20, right: 20, bottom: 20, left: 20 },
            animated: true,
          });
        }, 100);
      }
    }
  }, [coordinates, isNavigating, routeCoordinates.length]);

  if (!coordinates) return null;

  return (
    <TouchableOpacity
      style={[styles.container, { width: mapSize, height: mapSize }]}
      onPress={onExpand}
      activeOpacity={0.9}
    >
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        customMapStyle={Platform.OS === 'android' ? mapStyle : undefined}
        userInterfaceStyle="dark"
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: isNavigating ? 0.01 : 0.005,
          longitudeDelta: isNavigating ? 0.01 : 0.005,
        }}
      >
        {/* Destination marker when navigating */}
        {currentDestination && (
          <Marker coordinate={currentDestination.coordinates}>
            <View style={styles.destinationMarker}>
              <MapPin size={8} color={colors.text.primary} />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.map.route}
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Expand button overlay */}
      <View style={styles.expandButton}>
        <Maximize2 size={10} color={colors.text.primary} />
      </View>

      {/* Navigation badge */}
      {isNavigating && currentRoute && (
        <View style={styles.navBadge}>
          <Navigation size={7} color={colors.text.inverse} />
          <Text style={styles.navBadgeText}>
            {Math.round(currentRoute.totalDuration)}m
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borders.radius.md, // Smaller radius for compact map
    overflow: 'hidden',
    backgroundColor: colors.background.secondary,
    borderWidth: 1.5, // Thinner border
    borderColor: colors.border.default,
    ...shadows.sm,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  destinationMarker: {
    backgroundColor: colors.map.marker,
    borderRadius: borders.radius.full,
    padding: 2,
    borderWidth: 1.5,
    borderColor: colors.text.primary,
  },
  expandButton: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: colors.background.tertiary,
    borderRadius: borders.radius.xs,
    padding: 2,
    opacity: 0.85,
  },
  navBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: colors.accent.primary,
    borderRadius: borders.radius.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
    gap: 2,
  },
  navBadgeText: {
    color: colors.text.inverse,
    fontSize: 8,
    fontWeight: '600',
  },
});
