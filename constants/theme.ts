// === TOMO DARK THEME - Explorer Teal ===
// A modern, travel-focused dark theme with teal accents

export const colors = {
  // Core dark mode colors
  background: {
    primary: '#0D1117',      // Main background
    secondary: '#161B22',    // Cards, surfaces
    tertiary: '#21262D',     // Elevated surfaces, modals
    elevated: '#30363D',     // Highest elevation
  },

  // Text colors
  text: {
    primary: '#F0F6FC',      // Main text
    secondary: '#8B949E',    // Muted text
    tertiary: '#6E7681',     // Disabled, hints
    inverse: '#0D1117',      // Text on light backgrounds
    // Legacy support for components using colors.text.light.xxx
    light: {
      primary: '#F0F6FC',
      secondary: '#8B949E',
      tertiary: '#6E7681',
    },
    dark: {
      primary: '#F0F6FC',
      secondary: '#8B949E',
      tertiary: '#6E7681',
    },
  },

  // Brand accent - Teal
  accent: {
    primary: '#00D4AA',      // Main accent (buttons, links, user bubbles)
    secondary: '#58A6FF',    // Secondary accent (links, highlights)
    muted: 'rgba(0, 212, 170, 0.15)',  // Subtle accent backgrounds
    gradient: ['#00D4AA', '#00B894'],   // Gradient for special elements
  },

  // Semantic colors
  status: {
    success: '#3FB950',
    successMuted: 'rgba(63, 185, 80, 0.15)',
    successLight: 'rgba(63, 185, 80, 0.2)',  // Legacy support
    warning: '#D29922',
    warningMuted: 'rgba(210, 153, 34, 0.15)',
    warningLight: 'rgba(210, 153, 34, 0.2)',  // Legacy support
    error: '#F85149',
    errorMuted: 'rgba(248, 81, 73, 0.15)',
    errorLight: 'rgba(248, 81, 73, 0.2)',    // Legacy support
    info: '#58A6FF',
    infoMuted: 'rgba(88, 166, 255, 0.15)',
  },

  // Chat specific
  chat: {
    userBubble: '#00D4AA',
    userText: '#0D1117',
    assistantBubble: '#21262D',
    assistantText: '#F0F6FC',
    systemBubble: '#161B22',
    systemText: '#8B949E',
  },

  // Surface colors for cards, inputs, etc.
  surface: {
    card: '#161B22',
    cardHover: '#21262D',
    cardBorder: '#30363D',
    input: '#0D1117',
    inputBorder: '#30363D',
    inputFocused: '#00D4AA',
    modal: '#161B22',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
  },

  // Interactive elements
  interactive: {
    primary: '#00D4AA',
    primaryHover: '#00E4B8',
    primaryPressed: '#00C49A',
    secondary: '#21262D',
    secondaryHover: '#30363D',
    secondaryPressed: '#161B22',
    disabled: '#21262D',
    disabledText: '#6E7681',
  },

  // Map specific
  map: {
    route: '#00D4AA',
    routeAlt: '#58A6FF',
    marker: '#F85149',
    markerSelected: '#00D4AA',
    userLocation: '#58A6FF',
  },

  // Budget colors
  budget: {
    onTrack: '#3FB950',
    warning: '#D29922',
    over: '#F85149',
    track: '#30363D',
    trackBg: '#21262D', // Legacy support
  },

  // Border colors
  border: {
    default: '#30363D',
    muted: '#21262D',
    accent: '#00D4AA',
  },

  // Legacy support - keeping for backwards compatibility
  backgrounds: {
    morning: ['#0D1117', '#161B22', '#21262D'],
    afternoon: ['#0D1117', '#161B22', '#21262D'],
    evening: ['#0D1117', '#161B22', '#21262D'],
    night: ['#0D1117', '#161B22', '#21262D'],
    rain: ['#0D1117', '#161B22', '#21262D'],
  },

  // Legacy text colors (for backwards compatibility)
  text_legacy: {
    light: {
      primary: '#1A1A1A',
      secondary: 'rgba(0,0,0,0.6)',
      tertiary: 'rgba(0,0,0,0.4)',
    },
    dark: {
      primary: '#F0F6FC',
      secondary: '#8B949E',
      tertiary: '#6E7681',
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
    '4xl': 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  // Preset combinations
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

// === SHADOWS (adjusted for dark mode) ===
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#00D4AA',
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

// === MAP STYLES (Google Maps dark mode) ===
export const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0D1117' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0D1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8B949E' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#F0F6FC' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8B949E' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#161B22' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3FB950' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#21262D' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#30363D' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8B949E' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#30363D' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#21262D' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#F0F6FC' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#21262D' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#58A6FF' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#161B22' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6E7681' }],
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

// For backwards compatibility - now always returns dark theme colors
export function getBackgroundColors(time: TimeOfDay, weather?: WeatherCondition): string[] {
  return [colors.background.primary, colors.background.secondary, colors.background.tertiary];
}

export function isLightBackground(time: TimeOfDay): boolean {
  return false; // Always dark mode now
}

export function getTextColors(time: TimeOfDay) {
  return colors.text_legacy.dark;
}
