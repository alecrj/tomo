import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense } from '../types';

interface BudgetState {
  tripTotal: number;
  tripDays: number;
  dailyBudget: number;
  expenses: Expense[];

  // Computed getters - these are methods, call outside of selectors
  spentToday: () => number;
  remainingToday: () => number;

  // Optimized derived selectors (use these in React components)
  getTodayExpenses: () => Expense[];

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

      // Helper to get today's date range (cached per call)
      getTodayExpenses: () => {
        const expenses = get().expenses;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 86400000 - 1; // 24 hours - 1ms

        return expenses.filter((e) => e.timestamp >= todayStart && e.timestamp <= todayEnd);
      },

      // Computed values - optimized to reuse getTodayExpenses
      spentToday: () => {
        return get().getTodayExpenses().reduce((sum, e) => sum + e.amount, 0);
      },

      remainingToday: () => {
        const { dailyBudget, spentToday } = get();
        return dailyBudget - spentToday();
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
