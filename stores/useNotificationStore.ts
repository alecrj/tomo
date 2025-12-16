import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification, NotificationType, NotificationPriority, Coordinates } from '../types';

interface NotificationStoreState {
  notifications: Notification[];

  // Settings
  lastTrainWarningMinutes: number; // Warn X minutes before last train
  placeClosingWarningMinutes: number; // Warn X minutes before place closes
  budgetWarningThreshold: number; // Warn when X% of budget spent

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'dismissed'>) => void;
  dismissNotification: (id: string) => void;
  dismissAllOfType: (type: NotificationType) => void;
  clearExpired: () => void;

  // Query notifications
  getActiveNotifications: () => Notification[];
  getUrgentNotifications: () => Notification[];
  hasUnreadNotifications: () => boolean;

  // Specific notification creators
  createLastTrainWarning: (
    minutesRemaining: number,
    trainLine: string,
    homeBase: string,
    coordinates?: Coordinates
  ) => void;

  createPlaceClosingWarning: (
    placeName: string,
    minutesRemaining: number,
    placeId?: string,
    coordinates?: Coordinates
  ) => void;

  createWeatherAlert: (
    condition: string,
    description: string,
    scheduledFor?: number
  ) => void;

  createBudgetWarning: (
    percentUsed: number,
    remainingAmount: number,
    currencySymbol: string
  ) => void;

  createTransitUpdate: (
    title: string,
    body: string,
    priority: NotificationPriority
  ) => void;

  // Settings
  setLastTrainWarningMinutes: (minutes: number) => void;
  setPlaceClosingWarningMinutes: (minutes: number) => void;
  setBudgetWarningThreshold: (percent: number) => void;

  // Clear all
  clearAll: () => void;
}

const initialState = {
  notifications: [] as Notification[],
  lastTrainWarningMinutes: 45, // Default: warn 45 min before last train
  placeClosingWarningMinutes: 30, // Default: warn 30 min before place closes
  budgetWarningThreshold: 80, // Default: warn at 80% spent
};

export const useNotificationStore = create<NotificationStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          dismissed: false,
        };

        set((state) => ({
          notifications: [notification, ...state.notifications],
        }));

        console.log('[Notification] Added:', notification.title);
        return notification;
      },

      dismissNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, dismissed: true } : n
          ),
        }));
        console.log('[Notification] Dismissed:', id);
      },

      dismissAllOfType: (type) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.type === type ? { ...n, dismissed: true } : n
          ),
        }));
        console.log('[Notification] Dismissed all of type:', type);
      },

      clearExpired: () => {
        const now = Date.now();
        set((state) => ({
          notifications: state.notifications.filter(
            (n) => !n.expiresAt || n.expiresAt > now
          ),
        }));
      },

      getActiveNotifications: () => {
        const now = Date.now();
        return get().notifications.filter(
          (n) =>
            !n.dismissed &&
            (!n.expiresAt || n.expiresAt > now) &&
            (!n.scheduledFor || n.scheduledFor <= now)
        );
      },

      getUrgentNotifications: () => {
        return get()
          .getActiveNotifications()
          .filter((n) => n.priority === 'urgent');
      },

      hasUnreadNotifications: () => {
        return get().getActiveNotifications().length > 0;
      },

      // === SPECIFIC NOTIFICATION CREATORS ===

      createLastTrainWarning: (minutesRemaining, trainLine, homeBase, coordinates) => {
        const priority: NotificationPriority =
          minutesRemaining <= 15 ? 'urgent' : minutesRemaining <= 30 ? 'warning' : 'info';

        get().addNotification({
          type: 'last_train',
          priority,
          title: `Last train to ${homeBase}`,
          body: `The last ${trainLine} leaves in ${minutesRemaining} minutes`,
          expiresAt: Date.now() + minutesRemaining * 60 * 1000,
          action: {
            type: 'navigate_home',
          },
          coordinates,
        });
      },

      createPlaceClosingWarning: (placeName, minutesRemaining, placeId, coordinates) => {
        const priority: NotificationPriority =
          minutesRemaining <= 15 ? 'urgent' : 'warning';

        get().addNotification({
          type: 'place_closing',
          priority,
          title: `${placeName} closing soon`,
          body: `Closes in ${minutesRemaining} minutes`,
          expiresAt: Date.now() + minutesRemaining * 60 * 1000,
          action: {
            type: 'view_details',
            payload: { placeId },
          },
          placeId,
          coordinates,
        });
      },

      createWeatherAlert: (condition, description, scheduledFor) => {
        get().addNotification({
          type: 'weather',
          priority: 'warning',
          title: `Weather Alert: ${condition}`,
          body: description,
          scheduledFor,
          expiresAt: scheduledFor
            ? scheduledFor + 2 * 60 * 60 * 1000 // Expires 2 hours after scheduled
            : Date.now() + 6 * 60 * 60 * 1000, // Expires in 6 hours
        });
      },

      createBudgetWarning: (percentUsed, remainingAmount, currencySymbol) => {
        const priority: NotificationPriority = percentUsed >= 100 ? 'urgent' : 'warning';

        get().addNotification({
          type: 'budget',
          priority,
          title:
            percentUsed >= 100
              ? 'Budget exceeded!'
              : `${Math.round(percentUsed)}% of budget spent`,
          body:
            percentUsed >= 100
              ? `You've exceeded your daily budget`
              : `${currencySymbol}${remainingAmount.toFixed(0)} remaining today`,
          // Budget warnings expire at end of day
          expiresAt: new Date().setHours(23, 59, 59, 999),
        });
      },

      createTransitUpdate: (title, body, priority) => {
        get().addNotification({
          type: 'transit',
          priority,
          title,
          body,
          // Transit updates are short-lived
          expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
        });
      },

      // === SETTINGS ===

      setLastTrainWarningMinutes: (minutes) => {
        set({ lastTrainWarningMinutes: minutes });
        console.log('[Notification] Last train warning set to:', minutes, 'minutes');
      },

      setPlaceClosingWarningMinutes: (minutes) => {
        set({ placeClosingWarningMinutes: minutes });
        console.log('[Notification] Place closing warning set to:', minutes, 'minutes');
      },

      setBudgetWarningThreshold: (percent) => {
        set({ budgetWarningThreshold: percent });
        console.log('[Notification] Budget warning threshold set to:', percent, '%');
      },

      clearAll: () => {
        set({ notifications: [] });
        console.log('[Notification] Cleared all notifications');
      },
    }),
    {
      name: 'tomo-notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
