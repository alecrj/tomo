import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense } from '../types';

interface BudgetState {
  tripTotal: number;
  tripDays: number;
  dailyBudget: number;
  expenses: Expense[];

  // Computed getters
  spentToday: () => number;
  remainingToday: () => number;

  // Actions
  setTripBudget: (total: number, days: number) => void;
  setDailyBudget: (amount: number) => void;
  addExpense: (expense: Expense) => void;
  removeExpense: (expenseId: string) => void;
  reset: () => void;
}

const initialState = {
  tripTotal: 0,
  tripDays: 0,
  dailyBudget: 0,
  expenses: [] as Expense[],
};

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Computed values
      spentToday: () => {
        const expenses = get().expenses;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        return expenses
          .filter((e) => e.timestamp >= todayStart.getTime() && e.timestamp <= todayEnd.getTime())
          .reduce((sum, e) => sum + e.amount, 0);
      },

      remainingToday: () => {
        const dailyBudget = get().dailyBudget;
        const spentToday = get().spentToday();
        return dailyBudget - spentToday;
      },

      // Actions
      setTripBudget: (total, days) =>
        set({
          tripTotal: total,
          tripDays: days,
          dailyBudget: Math.floor(total / days),
        }),

      setDailyBudget: (amount) => set({ dailyBudget: amount }),

      addExpense: (expense) =>
        set((state) => ({
          expenses: [...state.expenses, expense],
        })),

      removeExpense: (expenseId) =>
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== expenseId),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'tomo-budget-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
