// === TOMO CLEAN DARK THEME ===
// Minimal, elegant dark mode with blacks, greys, and whites
// No accent colors - clean and professional

export const colors = {
  // Core dark mode colors
  background: {
    primary: '#000000',      // Pure black main background
    secondary: '#0A0A0A',    // Slightly lighter for cards
    tertiary: '#141414',     // Elevated surfaces
    elevated: '#1A1A1A',     // Highest elevation
  },

  // Text colors
  text: {
    primary: '#FFFFFF',      // Pure white for main text
    secondary: '#A0A0A0',    // Grey for muted text
    tertiary: '#666666',     // Darker grey for hints
    inverse: '#000000',      // Black text on light backgrounds
    // Light theme text colors (for backward compatibility)
    light: {
      primary: '#FFFFFF',
      secondary: '#A0A0A0',
      tertiary: '#666666',
    },
    // Dark theme text colors (for backward compatibility)
    dark: {
      primary: '#000000',
      secondary: '#333333',
      tertiary: '#666666',
    },
  },

  // Accent - Clean white/grey instead of teal
  accent: {
    primary: '#FFFFFF',      // White for primary actions
    secondary: '#E0E0E0',    // Light grey for secondary
    muted: 'rgba(255, 255, 255, 0.08)',  // Subtle backgrounds
  },

  // Semantic colors (muted versions)
  status: {
    success: '#4ADE80',      // Soft green
    successMuted: 'rgba(74, 222, 128, 0.15)',
    successLight: 'rgba(74, 222, 128, 0.25)',
    warning: '#FBBF24',      // Soft amber
    warningMuted: 'rgba(251, 191, 36, 0.15)',
    warningLight: 'rgba(251, 191, 36, 0.25)',
    error: '#F87171',        // Soft red
    errorMuted: 'rgba(248, 113, 113, 0.15)',
    errorLight: 'rgba(248, 113, 113, 0.25)',
    info: '#60A5FA',         // Soft blue
    infoMuted: 'rgba(96, 165, 250, 0.15)',
    infoLight: 'rgba(96, 165, 250, 0.25)',
  },

  // Chat specific
  chat: {
    userBubble: '#FFFFFF',   // White user bubble
    userText: '#000000',     // Black text on white
    assistantBubble: '#141414', // Dark grey assistant bubble
    assistantText: '#FFFFFF',   // White text
    systemBubble: '#0A0A0A',
    systemText: '#A0A0A0',
  },

  // Surface colors
  surface: {
    card: '#0A0A0A',
    cardHover: '#141414',
    cardBorder: '#1A1A1A',
    input: '#0A0A0A',
    inputBorder: '#1A1A1A',
    inputFocused: '#FFFFFF',
    modal: '#0A0A0A',
    modalOverlay: 'rgba(0, 0, 0, 0.85)',
  },

  // Interactive elements
  interactive: {
    primary: '#FFFFFF',
    primaryHover: '#E0E0E0',
    primaryPressed: '#C0C0C0',
    secondary: '#141414',
    secondaryHover: '#1A1A1A',
    secondaryPressed: '#0A0A0A',
    disabled: '#1A1A1A',
    disabledText: '#666666',
  },

  // Map specific
  map: {
    route: '#FFFFFF',
    routeAlt: '#A0A0A0',
    marker: '#FFFFFF',
    markerSelected: '#FFFFFF',
    userLocation: '#60A5FA',
  },

  // Budget colors
  budget: {
    onTrack: '#4ADE80',
    warning: '#FBBF24',
    over: '#F87171',
    track: '#1A1A1A',
    trackBg: '#141414',
  },

  // Border colors
  border: {
    default: '#1A1A1A',
    muted: '#141414',
    accent: '#333333',
  },

  // Legacy support
  backgrounds: {
    morning: ['#000000', '#0A0A0A', '#141414'],
    afternoon: ['#000000', '#0A0A0A', '#141414'],
    evening: ['#000000', '#0A0A0A', '#141414'],
    night: ['#000000', '#0A0A0A', '#141414'],
    rain: ['#000000', '#0A0A0A', '#141414'],
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
    '4xl': 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  presets: {
    greeting: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
    title: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3 },
    sectionLabel: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
    cardTitle: { fontSize: 16, fontWeight: '600' as const },
    cardMeta: { fontSize: 13, fontWeight: '500' as const },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    bodyLarge: { fontSize: 17, fontWeight: '400' as const, lineHeight: 24 },
    button: { fontSize: 15, fontWeight: '600' as const },
    buttonSmall: { fontSize: 13, fontWeight: '600' as const },
    caption: { fontSize: 12, fontWeight: '500' as const },
    timestamp: { fontSize: 11, fontWeight: '400' as const },
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
  '4xl': 40,
};

// === BORDERS ===
export const borders = {
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
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
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
};

// === ANIMATION TIMINGS ===
export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 15,
    stiffness: 150,
  },
};

// === MAP STYLES (Clean dark mode) ===
export const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#000000' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#666666' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#666666' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0A0A0A' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4ADE80' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#141414' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1A1A1A' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#666666' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#1A1A1A' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#141414' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#141414' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A0A0A0' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0A0A0A' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#666666' }],
  },
];

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
  return [colors.background.primary, colors.background.secondary, colors.background.tertiary];
}

export function isLightBackground(time: TimeOfDay): boolean {
  return false; // Always dark mode
}

export function getTextColors(time: TimeOfDay) {
  return {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    tertiary: colors.text.tertiary,
  };
}
