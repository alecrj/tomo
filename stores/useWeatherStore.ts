import { create } from 'zustand';
import { WeatherCondition } from '../types';

interface WeatherState {
  condition: WeatherCondition | null;
  temperature: number | null;
  loading: boolean;

  // Actions
  setWeather: (condition: WeatherCondition, temperature: number) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  condition: null,
  temperature: null,
  loading: false,
};

export const useWeatherStore = create<WeatherState>((set) => ({
  ...initialState,

  setWeather: (condition, temperature) => set({ condition, temperature }),
  setLoading: (loading) => set({ loading }),
  reset: () => set(initialState),
}));
