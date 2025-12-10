import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Visit, Trip, CityStay, Coordinates } from '../types';

interface TripState {
  currentTrip: Trip | null;
  pastTrips: Trip[];

  // Legacy fields (keep for compatibility)
  startDate: string | null;
  currentDay: number;
  visits: Visit[];
  completedDestinationIds: string[];
  totalWalkingMinutes: number;

  // New trip management
  startTrip: (name?: string) => void;
  endTrip: () => void;
  addVisit: (visit: Omit<Visit, 'timestamp'>) => void;
  setHomeBase: (city: string, homeBase: { name: string; address: string; coordinates: Coordinates }) => void;
  switchCity: (city: string, country: string) => void;
  getCurrentCity: () => CityStay | null;
  getTripStats: () => Trip['stats'] | null;

  // Legacy actions
  startTripLegacy: (startDate: string) => void;
  completeDestination: (destinationId: string) => void;
  addWalkingTime: (minutes: number) => void;
  reset: () => void;
}

const initialState = {
  currentTrip: null,
  pastTrips: [],
  startDate: null,
  currentDay: 0,
  visits: [] as Visit[],
  completedDestinationIds: [] as string[],
  totalWalkingMinutes: 0,
};

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Start a new trip
      startTrip: (name?: string) => {
        const trip: Trip = {
          id: `trip_${Date.now()}`,
          name: name || `Trip ${new Date().toLocaleDateString()}`,
          startDate: Date.now(),
          isActive: true,
          countries: [],
          cities: [],
          stats: {
            totalPlaces: 0,
            totalExpenses: 0,
            totalDays: 1,
            citiesVisited: 0,
            countriesVisited: 0,
          },
        };

        set({ currentTrip: trip });
        console.log('[Trip] Started new trip:', trip.name);
      },

      // End current trip
      endTrip: () => {
        const { currentTrip, pastTrips } = get();
        if (!currentTrip) return;

        const endedTrip: Trip = {
          ...currentTrip,
          endDate: Date.now(),
          isActive: false,
          stats: {
            ...currentTrip.stats,
            totalDays: Math.ceil((Date.now() - currentTrip.startDate) / (1000 * 60 * 60 * 24)),
          },
        };

        set({
          currentTrip: null,
          pastTrips: [...pastTrips, endedTrip],
        });

        console.log('[Trip] Ended trip:', endedTrip.name);
      },

      // Add a visit to current trip
      addVisit: (visitData) => {
        const { currentTrip } = get();
        if (!currentTrip) {
          // Auto-start trip if not started
          get().startTrip();
        }

        const trip = get().currentTrip;
        if (!trip) return;

        const visit: Visit = {
          ...visitData,
          timestamp: Date.now(),
        };

        // Find or create city stay
        let cityIndex = trip.cities.findIndex(
          (c) => c.name === visit.city && c.country === visit.country
        );

        if (cityIndex === -1) {
          // New city
          const newCity: CityStay = {
            name: visit.city,
            country: visit.country,
            arrivedAt: Date.now(),
            visits: [visit],
            totalExpenses: visit.expense || 0,
          };
          trip.cities.push(newCity);
          cityIndex = trip.cities.length - 1;

          // Update countries list
          if (!trip.countries.includes(visit.country)) {
            trip.countries.push(visit.country);
          }

          // Set as current city
          trip.currentCity = visit.city;
          trip.currentCountry = visit.country;

          console.log('[Trip] Arrived in new city:', visit.city, visit.country);
        } else {
          // Existing city
          trip.cities[cityIndex].visits.push(visit);
          trip.cities[cityIndex].totalExpenses += visit.expense || 0;
        }

        // Update stats
        trip.stats.totalPlaces = trip.cities.reduce((sum, c) => sum + c.visits.length, 0);
        trip.stats.totalExpenses = trip.cities.reduce((sum, c) => sum + c.totalExpenses, 0);
        trip.stats.citiesVisited = trip.cities.length;
        trip.stats.countriesVisited = trip.countries.length;

        // Update legacy visits array
        const allVisits = trip.cities.flatMap((c) => c.visits);

        set({
          currentTrip: { ...trip },
          visits: allVisits,
        });

        console.log('[Trip] Added visit:', visit.name, 'in', visit.city);
      },

      // Set home base for current city
      setHomeBase: (city, homeBase) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        const cityIndex = currentTrip.cities.findIndex((c) => c.name === city);
        if (cityIndex === -1) return;

        currentTrip.cities[cityIndex].homeBase = {
          ...homeBase,
          setAt: Date.now(),
        };

        set({ currentTrip: { ...currentTrip } });
        console.log('[Trip] Set home base in', city, ':', homeBase.name);
      },

      // Switch to a different city (when traveling)
      switchCity: (city, country) => {
        const { currentTrip } = get();
        if (!currentTrip) return;

        // Mark old city as left
        const oldCityIndex = currentTrip.cities.findIndex(
          (c) => c.name === currentTrip.currentCity
        );
        if (oldCityIndex !== -1 && !currentTrip.cities[oldCityIndex].leftAt) {
          currentTrip.cities[oldCityIndex].leftAt = Date.now();
        }

        // Check if returning to previous city or new city
        const existingCityIndex = currentTrip.cities.findIndex(
          (c) => c.name === city && c.country === country
        );

        if (existingCityIndex !== -1) {
          // Returning to previous city
          currentTrip.cities[existingCityIndex].leftAt = undefined;
          currentTrip.currentCity = city;
          currentTrip.currentCountry = country;
          console.log('[Trip] Returned to', city);
        } else {
          // New city - will be created when first visit is added
          currentTrip.currentCity = city;
          currentTrip.currentCountry = country;
          console.log('[Trip] Switched to new city:', city);
        }

        set({ currentTrip: { ...currentTrip } });
      },

      // Get current city stay
      getCurrentCity: () => {
        const { currentTrip } = get();
        if (!currentTrip || !currentTrip.currentCity) return null;

        return (
          currentTrip.cities.find(
            (c) => c.name === currentTrip.currentCity && !c.leftAt
          ) || null
        );
      },

      // Get trip stats
      getTripStats: () => {
        const { currentTrip } = get();
        return currentTrip?.stats || null;
      },

      // Legacy actions (keep for compatibility)
      startTripLegacy: (startDate) => set({ startDate, currentDay: 1 }),
      completeDestination: (destinationId) =>
        set((state) => ({
          completedDestinationIds: [...state.completedDestinationIds, destinationId],
        })),
      addWalkingTime: (minutes) =>
        set((state) => ({
          totalWalkingMinutes: state.totalWalkingMinutes + minutes,
        })),
      reset: () => set(initialState),
    }),
    {
      name: 'tomo-trip-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
