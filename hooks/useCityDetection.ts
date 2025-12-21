import { useEffect, useRef, useState } from 'react';
import { useLocationStore } from '../stores/useLocationStore';
import { useTripStore } from '../stores/useTripStore';

export interface CityChange {
  previousCity: string | null;
  newCity: string;
  newCountry: string;
}

/**
 * Hook to detect city changes based on GPS location
 * Returns the latest city change event when the user moves to a new city
 */
export function useCityDetection(): CityChange | null {
  const neighborhood = useLocationStore((state) => state.neighborhood);
  const currentTrip = useTripStore((state) => state.currentTrip);
  const switchCity = useTripStore((state) => state.switchCity);

  const [cityChange, setCityChange] = useState<CityChange | null>(null);
  const lastDetectedCity = useRef<string | null>(null);

  useEffect(() => {
    if (!neighborhood) return;

    // Parse city and country from neighborhood string
    // Format is typically: "Neighborhood, City, Country" or "City, Country"
    const parts = neighborhood.split(',').map((p) => p.trim());

    if (parts.length < 2) return;

    // Get city and country from the last two parts
    const newCountry = parts[parts.length - 1];
    const newCity = parts[parts.length - 2];

    if (!newCity || !newCountry) return;

    // Check if this is a new city
    const currentCity = currentTrip?.currentCity;
    const cityKey = `${newCity}-${newCountry}`;

    if (lastDetectedCity.current !== cityKey) {
      const previousCity = lastDetectedCity.current ? currentCity : null;
      lastDetectedCity.current = cityKey;

      // Only trigger city change if we have a current trip and the city actually changed
      if (currentTrip && currentCity && currentCity !== newCity) {

        // Update the trip store
        switchCity(newCity, newCountry);

        // Emit city change event
        setCityChange({
          previousCity: currentCity,
          newCity,
          newCountry,
        });
      } else if (!currentTrip || !currentCity) {
        // First city detection - just record it, don't emit change
      }
    }
  }, [neighborhood, currentTrip?.currentCity]);

  // Clear city change after it's been consumed
  const clearCityChange = () => setCityChange(null);

  return cityChange;
}

/**
 * Get city and country from neighborhood string
 */
export function parseNeighborhood(neighborhood: string): { city: string; country: string } | null {
  const parts = neighborhood.split(',').map((p) => p.trim());

  if (parts.length < 2) return null;

  return {
    city: parts[parts.length - 2],
    country: parts[parts.length - 1],
  };
}
