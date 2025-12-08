import { Stamp } from '../../types';
import { TOKYO_STAMPS } from './tokyo';

// City name mapping
export type SupportedCity = 'tokyo';

// City stamps registry
const CITY_STAMPS: Record<string, Omit<Stamp, 'completed' | 'completedAt'>[]> = {
  tokyo: TOKYO_STAMPS,
  // Future cities can be added here:
  // kyoto: KYOTO_STAMPS,
  // osaka: OSAKA_STAMPS,
};

/**
 * Get stamps for a specific city
 * @param cityName - Name of the city (case-insensitive)
 * @returns Array of stamps for that city, or null if city not supported
 */
export function getStampsForCity(
  cityName: string
): Omit<Stamp, 'completed' | 'completedAt'>[] | null {
  const normalizedCity = cityName.toLowerCase();
  return CITY_STAMPS[normalizedCity] || null;
}

/**
 * Check if a city has stamps available
 * @param cityName - Name of the city (case-insensitive)
 * @returns true if city is supported
 */
export function hasCityStamps(cityName: string): boolean {
  return cityName.toLowerCase() in CITY_STAMPS;
}

/**
 * Get all supported cities
 * @returns Array of supported city names
 */
export function getSupportedCities(): string[] {
  return Object.keys(CITY_STAMPS);
}
