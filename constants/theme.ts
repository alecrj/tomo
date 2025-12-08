// === COLORS ===
export const colors = {
  // Time-based backgrounds (arrays for gradients)
  backgrounds: {
    morning: ['#87CEEB', '#B4E4FF', '#E8F4F8'],
    afternoon: ['#5BA4E6', '#7EC8E3', '#B4E4FF'],
    evening: ['#2D3436', '#636E72', '#FDA085'],
    night: ['#0F0F1A', '#1A1A2E', '#2D2D44'],
    rain: ['#4A5568', '#636E72', '#9CA3AF'],
  },

  // Text colors for light/dark backgrounds
  text: {
    light: {
      primary: '#1A1A1A',
      secondary: 'rgba(0,0,0,0.6)',
      tertiary: 'rgba(0,0,0,0.4)',
    },
    dark: {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.7)',
      tertiary: 'rgba(255,255,255,0.5)',
    },
  },

  // UI colors
  surface: {
    card: 'rgba(255, 255, 255, 0.95)',
    cardHover: 'rgba(255, 255, 255, 1)',
    modal: '#FFFFFF',
    input: '#F3F4F6',
    inputFocused: '#E5E7EB',
  },

  // Interactive
  interactive: {
    primary: '#111827',
    primaryHover: '#1F2937',
    secondary: '#F3F4F6',
    secondaryHover: '#E5E7EB',
    danger: '#EF4444',
  },

  // Status
  status: {
    success: '#22C55E',
    successLight: '#F0FDF4',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    error: '#EF4444',
    errorLight: '#FEF2F2',
  },

  // Budget
  budget: {
    onTrack: '#22C55E',
    warning: '#F59E0B',
    over: '#EF4444',
    trackBg: {
      light: 'rgba(0,0,0,0.1)',
      dark: 'rgba(255,255,255,0.15)',
    },
  },
};

// === TYPOGRAPHY ===
export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  // Preset combinations
  presets: {
    greeting: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.5 },
    sectionLabel: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
    cardTitle: { fontSize: 15, fontWeight: '600' as const },
    cardMeta: { fontSize: 12, fontWeight: '500' as const },
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    button: { fontSize: 14, fontWeight: '600' as const },
    caption: { fontSize: 12, fontWeight: '500' as const },
  },
};

// === SPACING ===
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

// === BORDERS ===
export const borders = {
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  width: {
    hairline: 0.5,
    thin: 1,
    medium: 2,
  },
};

// === SHADOWS ===
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
};

// === HELPERS ===
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow';

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getBackgroundColors(time: TimeOfDay, weather?: WeatherCondition): string[] {
  if (weather === 'rain') return colors.backgrounds.rain;
  return colors.backgrounds[time];
}

export function isLightBackground(time: TimeOfDay): boolean {
  return time === 'morning' || time === 'afternoon';
}

export function getTextColors(time: TimeOfDay) {
  return isLightBackground(time) ? colors.text.light : colors.text.dark;
}
