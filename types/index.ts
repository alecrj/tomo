// === LOCATION ===
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Station {
  name: string;
  lines: string[];
}

export interface LocationContext {
  coordinates: Coordinates;
  nearestStation: Station | null;
  neighborhood: string | null;
  lastUpdated: number;
}

// === WEATHER ===
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow';

export interface Weather {
  condition: WeatherCondition;
  temperature: number;
  humidity: number;
  description: string;
}

// === TIME ===
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

// === DESTINATIONS ===

// A spot within a destination (suggestion, not requirement)
export interface Spot {
  placeId: string;
  name: string;
  description: string;
  rating?: number;
  priceLevel?: 1 | 2 | 3 | 4;
  photos?: string[];
  hours?: string;
  isOpen?: boolean;
}

// Transit step for navigation
export interface TransitStep {
  mode: 'walk' | 'train' | 'bus' | 'taxi';
  instruction: string; // "Walk to Shibuya Station"
  details?: string; // "Platform 2, look for green line"
  line?: string; // "Yamanote Line"
  direction?: string; // "Shinjuku direction"
  duration: number; // minutes
  distance?: number; // meters
}

// Full transit route (from routes service)
export interface TransitRoute {
  steps: TransitStep[];
  totalDuration: number; // minutes
  totalDistance: number; // meters
  polyline: string; // For map rendering
  lastTrain?: Date; // CRITICAL for warnings
}

// Simple transit preview (before full navigation)
export interface TransitPreview {
  method: 'walk' | 'train' | 'bus' | 'taxi';
  line?: string;
  totalMinutes: number;
  description: string; // "15 min by train"
}

// A contextual destination suggestion
export interface Destination {
  id: string;
  title: string;
  description: string; // One-line summary
  whatItIs: string; // Detailed explanation
  whenToGo: string; // "After 8pm - earlier is dead"
  neighborhood: string;
  category: 'food' | 'culture' | 'nightlife' | 'nature' | 'shopping' | 'iconic';
  whyNow: string; // "Perfect for evening, bars just opening"

  // Location
  placeId?: string; // Google Places ID (if specific place)
  address: string;
  coordinates: Coordinates;

  // Cost
  priceLevel: 1 | 2 | 3 | 4;
  estimatedCost?: number; // yen

  // Getting there
  transitPreview: TransitPreview;

  // Spots you might like (suggestions, not requirements)
  spots: Spot[];

  // Enrichment from Google Places API
  photos?: string[];
  rating?: number;
  hours?: string;
  isOpen?: boolean;
}

// Context sent to Claude for destination generation
export interface DestinationContext {
  location: Coordinates;
  neighborhood: string | null;
  timeOfDay: TimeOfDay;
  weather: Weather | null;
  budgetRemaining: number;
  dailyBudget: number;
  preferences: UserPreferences;
  visitedPlaces: Visit[];
  completedStamps: string[];
  excludedToday: string[]; // From "Something else" taps
  totalWalkingToday: number;
}

// === BUDGET ===
export interface Expense {
  id: string;
  amount: number; // yen
  category: 'food' | 'transport' | 'activity' | 'shopping' | 'other';
  note?: string;
  timestamp: number;
  destinationId?: string; // if associated with a destination
}

export interface Budget {
  tripTotal: number; // total budget in yen
  tripDays: number;
  dailyBudget: number; // calculated
  expenses: Expense[];
}

// === USER PREFERENCES ===
export interface HomeBase {
  name: string;
  address: string;
  coordinates: Coordinates;
}

export interface UserPreferences {
  homeBase: HomeBase | null;
  walkingTolerance: 'low' | 'moderate' | 'high';
  budget: 'budget' | 'moderate' | 'luxury';
  dietary: string[];
  interests: string[];
  avoidCrowds: boolean;
}

// === TRIP MEMORY ===
export interface Visit {
  placeId: string;
  name: string;
  neighborhood: string;
  timestamp: number;
  rating?: 'liked' | 'neutral' | 'disliked';
}

export interface TripMemory {
  tripId: string;
  startDate: number;
  currentDay: number;
  visits: Visit[];
  completedDestinationIds: string[];
  totalWalkingMinutes: number;
}

// === STAMPS (Must-Do Checklist) ===
export interface Stamp {
  id: string;
  title: string;
  description: string;
  neighborhood: string;
  category: 'iconic' | 'food' | 'culture' | 'nightlife' | 'nature';
  bestTime?: string; // "morning", "evening", etc
  tip: string;
  completed: boolean;
  completedAt?: number;
}

// === CHAT ===
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system'; // system for warnings
  content: string;
  timestamp: number;
  image?: string; // base64
  action?: {
    type: 'navigate_to_destination' | 'add_expense' | 'complete_stamp' | 'go_home';
    payload: any;
  };
}

// === APP CONTEXT (sent to Claude) ===
export interface AppContext {
  location: LocationContext;
  weather: Weather | null;
  timeOfDay: TimeOfDay;
  preferences: UserPreferences;
  budget: {
    dailyBudget: number;
    spentToday: number;
    remainingToday: number;
    onTrack: boolean;
  };
  tripMemory: TripMemory;
  recentMessages: ChatMessage[];
}

// === NEARBY PLACES (from Google Places API) ===
export interface NearbyPlace {
  placeId: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  rating?: number;
  priceLevel?: 1 | 2 | 3 | 4;
  types: string[];
  isOpen: boolean;
  distance: number; // meters
}

// === NAVIGATION STATE ===
export type NavigationMode = 'idle' | 'viewing_detail' | 'navigating' | 'companion_mode';

export interface NavigationState {
  mode: NavigationMode;
  currentDestination: Destination | null;
  currentRoute: TransitRoute | null;
  arrivalDetected: boolean;
}

// === PROACTIVE WARNINGS ===
export type WarningType = 'last_train' | 'closing_time' | 'weather' | 'budget' | 'energy';
export type WarningSeverity = 'info' | 'warning' | 'urgent';

export interface Warning {
  id: string;
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  action?: string; // "Get directions home"
  actionType?: 'navigate_home' | 'view_details' | 'dismiss';
  expiresAt?: number; // timestamp when warning is no longer relevant
  dismissed: boolean;
}
