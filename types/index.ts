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

// === MOVES ===
export interface TransitInfo {
  method: 'walk' | 'train' | 'bus' | 'taxi';
  line?: string;
  direction?: string;
  stops?: number;
  exitInfo?: string;
  walkingMinutes?: number;
  totalMinutes: number;
}

export interface Move {
  id: string;
  title: string;
  description: string;
  neighborhood: string;
  category: 'food' | 'culture' | 'walk' | 'nightlife' | 'shopping' | 'nature';
  duration: number; // minutes
  transit: TransitInfo;
  whyNow: string; // "Perfect for rainy evenings" etc
  priceLevel: 1 | 2 | 3 | 4; // 1 = cheap, 4 = expensive
  estimatedCost?: number; // yen
  highlights: string[];
  startingPoint: {
    name: string;
    address: string;
    coordinates: Coordinates;
  };
}

// === BUDGET ===
export interface Expense {
  id: string;
  amount: number; // yen
  category: 'food' | 'transport' | 'activity' | 'shopping' | 'other';
  note?: string;
  timestamp: number;
  moveId?: string; // if associated with a move
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
  budget: 'budget' | 'moderate' | 'flexible';
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
  completedMoveIds: string[];
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
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  image?: string; // base64
  action?: {
    type: 'navigate' | 'add_expense' | 'start_move' | 'stamp';
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
