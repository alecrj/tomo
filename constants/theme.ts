// === TOMO PREMIUM DARK THEME ===
// Rich, immersive dark mode with depth and personality
// Inspired by top-tier apps like Spotify, Linear, and Arc

export const colors = {
  // Core dark mode colors - rich blacks with subtle warmth
  background: {
    primary: '#09090B',      // Rich black with slight warmth
    secondary: '#18181B',    // Elevated cards
    tertiary: '#27272A',     // Higher surfaces
    elevated: '#3F3F46',     // Highest elevation (modals, popovers)
  },

  // Text colors - crisp whites and balanced greys
  text: {
    primary: '#FAFAFA',      // Crisp white (not pure white - easier on eyes)
    secondary: '#A1A1AA',    // Zinc 400 - readable secondary
    tertiary: '#71717A',     // Zinc 500 - muted hints
    inverse: '#09090B',      // Dark text on light backgrounds
    // Legacy support
    light: {
      primary: '#FAFAFA',
      secondary: '#A1A1AA',
      tertiary: '#71717A',
    },
    dark: {
      primary: '#09090B',
      secondary: '#3F3F46',
      tertiary: '#71717A',
    },
  },

  // Accent - Vibrant coral/orange for personality
  accent: {
    primary: '#F97316',      // Orange 500 - warm, inviting
    secondary: '#FB923C',    // Orange 400 - lighter variant
    tertiary: '#FDBA74',     // Orange 300 - subtle
    muted: 'rgba(249, 115, 22, 0.15)',  // Subtle accent backgrounds
    glow: 'rgba(249, 115, 22, 0.25)',   // For glow effects
  },

  // Semantic colors - refined, accessible
  status: {
    success: '#22C55E',      // Green 500
    successMuted: 'rgba(34, 197, 94, 0.15)',
    successLight: 'rgba(34, 197, 94, 0.25)',
    warning: '#EAB308',      // Yellow 500
    warningMuted: 'rgba(234, 179, 8, 0.15)',
    warningLight: 'rgba(234, 179, 8, 0.25)',
    error: '#EF4444',        // Red 500
    errorMuted: 'rgba(239, 68, 68, 0.15)',
    errorLight: 'rgba(239, 68, 68, 0.25)',
    info: '#3B82F6',         // Blue 500
    infoMuted: 'rgba(59, 130, 246, 0.15)',
    infoLight: 'rgba(59, 130, 246, 0.25)',
  },

  // Chat specific - polished bubbles
  chat: {
    userBubble: '#F97316',   // Accent color for user
    userText: '#FFFFFF',     // White text on accent
    assistantBubble: '#27272A', // Tertiary background
    assistantText: '#FAFAFA',   // Primary text
    systemBubble: '#18181B',
    systemText: '#A1A1AA',
  },

  // Surface colors - clear hierarchy
  surface: {
    card: '#18181B',
    cardHover: '#27272A',
    cardBorder: '#27272A',
    input: '#18181B',
    inputBorder: '#3F3F46',
    inputFocused: '#F97316',
    modal: '#18181B',
    modalOverlay: 'rgba(0, 0, 0, 0.80)',
  },

  // Interactive elements
  interactive: {
    primary: '#F97316',
    primaryHover: '#EA580C',
    primaryPressed: '#C2410C',
    secondary: '#27272A',
    secondaryHover: '#3F3F46',
    secondaryPressed: '#18181B',
    disabled: '#27272A',
    disabledText: '#52525B',
  },

  // Map specific
  map: {
    route: '#3B82F6',        // Blue route
    routeAlt: '#6366F1',     // Indigo alternative
    marker: '#F97316',       // Accent markers
    markerSelected: '#FB923C',
    userLocation: '#3B82F6',
  },

  // Budget colors
  budget: {
    onTrack: '#22C55E',
    warning: '#EAB308',
    over: '#EF4444',
    track: '#27272A',
    trackBg: '#18181B',
  },

  // Border colors - subtle but visible
  border: {
    default: '#27272A',
    muted: '#3F3F46',
    accent: '#F97316',
  },

  // Category colors - vibrant and distinct
  categories: {
    food: '#EF4444',         // Red
    coffee: '#92400E',       // Amber dark
    culture: '#8B5CF6',      // Violet
    activity: '#06B6D4',     // Cyan
    nightlife: '#EC4899',    // Pink
    nature: '#22C55E',       // Green
    shopping: '#F59E0B',     // Amber
    transport: '#6366F1',    // Indigo
  },

  // Time-based gradients for home screen
  gradients: {
    morning: ['#09090B', '#1E1B4B', '#312E81'],     // Deep indigo sunrise
    afternoon: ['#09090B', '#451A03', '#78350F'],   // Warm amber
    evening: ['#09090B', '#4C1D95', '#7C3AED'],     // Purple sunset
    night: ['#09090B', '#0F172A', '#1E293B'],       // Deep blue night
  },

  // Legacy support
  backgrounds: {
    morning: ['#09090B', '#1E1B4B', '#312E81'],
    afternoon: ['#09090B', '#451A03', '#78350F'],
    evening: ['#09090B', '#4C1D95', '#7C3AED'],
    night: ['#09090B', '#0F172A', '#1E293B'],
    rain: ['#09090B', '#1E293B', '#334155'],
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
    greeting: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
    title: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3 },
    sectionLabel: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
    cardTitle: { fontSize: 17, fontWeight: '600' as const },
    cardMeta: { fontSize: 13, fontWeight: '500' as const },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    bodyLarge: { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
    button: { fontSize: 16, fontWeight: '600' as const },
    buttonSmall: { fontSize: 14, fontWeight: '600' as const },
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
  '5xl': 48,
  '6xl': 64,
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
    '3xl': 32,
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
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glowSoft: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  inner: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 0,
  },
};

// === ANIMATION TIMINGS ===
export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
  spring: {
    damping: 15,
    stiffness: 150,
  },
  springBouncy: {
    damping: 12,
    stiffness: 180,
  },
  springSmooth: {
    damping: 20,
    stiffness: 120,
  },
};

// === MAP STYLES (Dark mode with visible features) ===
// Based on Google Maps dark theme - visible but muted
export const mapStyle = [
  // Base geometry - dark grey, NOT pure black
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  // Administrative areas
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  // POIs
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  // Roads - visible grey tones
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  // Transit
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  // Water - dark blue, visible
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

// === HELPERS ===
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow';

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getBackgroundColors(time: TimeOfDay, weather?: WeatherCondition): string[] {
  if (weather === 'rain') {
    return colors.backgrounds.rain;
  }
  return colors.backgrounds[time] || colors.backgrounds.night;
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

// Get gradient for time of day
export function getTimeGradient(time: TimeOfDay): string[] {
  return colors.gradients[time] || colors.gradients.night;
}

// Get category color
export function getCategoryColor(category: string): string {
  return colors.categories[category as keyof typeof colors.categories] || colors.accent.primary;
}
