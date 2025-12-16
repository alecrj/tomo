import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Itinerary,
  ItineraryDay,
  Activity,
  ActivityCategory,
  TimeSlot,
  PlaceCardData,
} from '../types';

interface ItineraryStoreState {
  itineraries: Itinerary[];
  activeItineraryId: string | null;

  // CRUD Operations
  createItinerary: (name: string, startDate: number, endDate: number, tripId?: string) => Itinerary;
  updateItinerary: (id: string, updates: Partial<Itinerary>) => void;
  deleteItinerary: (id: string) => void;

  // Active itinerary
  setActiveItinerary: (id: string | null) => void;
  getActiveItinerary: () => Itinerary | null;

  // Day management
  addDay: (itineraryId: string, date: number) => void;
  removeDay: (itineraryId: string, date: number) => void;

  // Activity management
  addActivity: (
    itineraryId: string,
    dayDate: number,
    activity: Omit<Activity, 'id'>
  ) => Activity;
  updateActivity: (
    itineraryId: string,
    dayDate: number,
    activityId: string,
    updates: Partial<Activity>
  ) => void;
  removeActivity: (itineraryId: string, dayDate: number, activityId: string) => void;
  reorderActivities: (itineraryId: string, dayDate: number, activityIds: string[]) => void;

  // Queries
  getItineraryForTrip: (tripId: string) => Itinerary | null;
  getActivitiesForDay: (itineraryId: string, date: number) => Activity[];
  getTodaysActivities: () => Activity[];
  getUpcomingActivity: () => Activity | null;

  // Bulk operations (for AI-generated itineraries)
  setItineraryDays: (itineraryId: string, days: ItineraryDay[]) => void;

  // Clear
  clearAll: () => void;
}

// Helper to get start of day timestamp
const getStartOfDay = (date: Date | number): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Helper to create day range
const createDayRange = (startDate: number, endDate: number): ItineraryDay[] => {
  const days: ItineraryDay[] = [];
  let currentDate = getStartOfDay(startDate);
  const end = getStartOfDay(endDate);

  while (currentDate <= end) {
    days.push({
      date: currentDate,
      activities: [],
    });
    currentDate += 24 * 60 * 60 * 1000; // Add one day
  }

  return days;
};

const initialState = {
  itineraries: [] as Itinerary[],
  activeItineraryId: null as string | null,
};

export const useItineraryStore = create<ItineraryStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      createItinerary: (name, startDate, endDate, tripId) => {
        const itinerary: Itinerary = {
          id: `itinerary-${Date.now()}`,
          name,
          startDate: getStartOfDay(startDate),
          endDate: getStartOfDay(endDate),
          days: createDayRange(startDate, endDate),
          tripId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          itineraries: [...state.itineraries, itinerary],
          activeItineraryId: itinerary.id,
        }));

        console.log('[Itinerary] Created:', name, 'with', itinerary.days.length, 'days');
        return itinerary;
      },

      updateItinerary: (id, updates) => {
        set((state) => ({
          itineraries: state.itineraries.map((i) =>
            i.id === id
              ? { ...i, ...updates, updatedAt: Date.now() }
              : i
          ),
        }));
        console.log('[Itinerary] Updated:', id);
      },

      deleteItinerary: (id) => {
        set((state) => ({
          itineraries: state.itineraries.filter((i) => i.id !== id),
          activeItineraryId:
            state.activeItineraryId === id ? null : state.activeItineraryId,
        }));
        console.log('[Itinerary] Deleted:', id);
      },

      setActiveItinerary: (id) => {
        set({ activeItineraryId: id });
        console.log('[Itinerary] Set active:', id);
      },

      getActiveItinerary: () => {
        const { itineraries, activeItineraryId } = get();
        return itineraries.find((i) => i.id === activeItineraryId) || null;
      },

      addDay: (itineraryId, date) => {
        const normalizedDate = getStartOfDay(date);
        set((state) => ({
          itineraries: state.itineraries.map((i) => {
            if (i.id !== itineraryId) return i;

            // Check if day already exists
            if (i.days.some((d) => d.date === normalizedDate)) return i;

            // Add day and sort by date
            const newDays = [...i.days, { date: normalizedDate, activities: [] }];
            newDays.sort((a, b) => a.date - b.date);

            return {
              ...i,
              days: newDays,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      removeDay: (itineraryId, date) => {
        const normalizedDate = getStartOfDay(date);
        set((state) => ({
          itineraries: state.itineraries.map((i) => {
            if (i.id !== itineraryId) return i;
            return {
              ...i,
              days: i.days.filter((d) => d.date !== normalizedDate),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      addActivity: (itineraryId, dayDate, activityData) => {
        const activity: Activity = {
          ...activityData,
          id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };

        const normalizedDate = getStartOfDay(dayDate);

        set((state) => ({
          itineraries: state.itineraries.map((i) => {
            if (i.id !== itineraryId) return i;
            return {
              ...i,
              days: i.days.map((d) => {
                if (d.date !== normalizedDate) return d;
                return {
                  ...d,
                  activities: [...d.activities, activity],
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));

        console.log('[Itinerary] Added activity:', activity.title);
        return activity;
      },

      updateActivity: (itineraryId, dayDate, activityId, updates) => {
        const normalizedDate = getStartOfDay(dayDate);
        set((state) => ({
          itineraries: state.itineraries.map((i) => {
            if (i.id !== itineraryId) return i;
            return {
              ...i,
              days: i.days.map((d) => {
                if (d.date !== normalizedDate) return d;
                return {
                  ...d,
                  activities: d.activities.map((a) =>
                    a.id === activityId ? { ...a, ...updates } : a
                  ),
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      removeActivity: (itineraryId, dayDate, activityId) => {
        const normalizedDate = getStartOfDay(dayDate);
        set((state) => ({
          itineraries: state.itineraries.map((i) => {
            if (i.id !== itineraryId) return i;
            return {
              ...i,
              days: i.days.map((d) => {
                if (d.date !== normalizedDate) return d;
                return {
                  ...d,
                  activities: d.activities.filter((a) => a.id !== activityId),
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
        console.log('[Itinerary] Removed activity:', activityId);
      },

      reorderActivities: (itineraryId, dayDate, activityIds) => {
        const normalizedDate = getStartOfDay(dayDate);
        set((state) => ({
          itineraries: state.itineraries.map((i) => {
            if (i.id !== itineraryId) return i;
            return {
              ...i,
              days: i.days.map((d) => {
                if (d.date !== normalizedDate) return d;

                // Reorder activities based on activityIds array order
                const orderedActivities = activityIds
                  .map((id) => d.activities.find((a) => a.id === id))
                  .filter((a): a is Activity => a !== undefined);

                return {
                  ...d,
                  activities: orderedActivities,
                };
              }),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      getItineraryForTrip: (tripId) => {
        return get().itineraries.find((i) => i.tripId === tripId) || null;
      },

      getActivitiesForDay: (itineraryId, date) => {
        const normalizedDate = getStartOfDay(date);
        const itinerary = get().itineraries.find((i) => i.id === itineraryId);
        if (!itinerary) return [];

        const day = itinerary.days.find((d) => d.date === normalizedDate);
        return day?.activities || [];
      },

      getTodaysActivities: () => {
        const today = getStartOfDay(Date.now());
        const active = get().getActiveItinerary();
        if (!active) return [];

        const todayDay = active.days.find((d) => d.date === today);
        return todayDay?.activities || [];
      },

      getUpcomingActivity: () => {
        const activities = get().getTodaysActivities();
        if (activities.length === 0) return null;

        const now = new Date();
        const currentHour = now.getHours();

        // Determine current time slot
        let currentSlot: TimeSlot;
        if (currentHour < 12) currentSlot = 'morning';
        else if (currentHour < 17) currentSlot = 'afternoon';
        else if (currentHour < 21) currentSlot = 'evening';
        else currentSlot = 'night';

        const slotOrder: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night'];
        const currentSlotIndex = slotOrder.indexOf(currentSlot);

        // Find next activity in current or upcoming time slots
        for (let i = currentSlotIndex; i < slotOrder.length; i++) {
          const slot = slotOrder[i];
          const activity = activities.find((a) => a.timeSlot === slot);
          if (activity) return activity;
        }

        return null;
      },

      setItineraryDays: (itineraryId, days) => {
        set((state) => ({
          itineraries: state.itineraries.map((i) => {
            if (i.id !== itineraryId) return i;
            return {
              ...i,
              days,
              updatedAt: Date.now(),
            };
          }),
        }));
        console.log('[Itinerary] Set days for:', itineraryId, '- total days:', days.length);
      },

      clearAll: () => {
        set({ itineraries: [], activeItineraryId: null });
        console.log('[Itinerary] Cleared all itineraries');
      },
    }),
    {
      name: 'tomo-itinerary-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
