import { DestinationContext, ChatMessage, PlaceCardData, InlineMapData, MessageAction, Coordinates } from '../types';
import { getPlacePhotoUrl, searchPlace, buildPhotoUrl } from './places';
import { getWalkingDirections } from './routes';
import { useOfflineStore } from '../stores/useOfflineStore';
import { useMemoryStore } from '../stores/useMemoryStore';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Get API key from environment
const getApiKey = () => process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

/**
 * Safely parse JSON with error handling
 * Returns null if parsing fails
 */
function safeJsonParse<T>(text: string, _context: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    return null;
  }
}

// Check if online
const checkOnline = (): boolean => {
  return useOfflineStore.getState().isOnline;
};

// Offline response for when user is disconnected
const getOfflineResponse = (): StructuredChatResponse => {
  return {
    content: "I'm currently offline. I've saved your message and will respond when you're back online. In the meantime, you can still view your saved places and cached data.",
  };
};

/**
 * Verify if a place is currently open using Google Places API
 */
async function verifyPlaceOpen(
  placeName: string,
  location: Coordinates
): Promise<{ isOpen: boolean; hours?: string; coordinates?: Coordinates; address?: string } | null> {
  try {
    console.log('[OpenAI] verifyPlaceOpen searching for:', placeName, 'near:', location);
    const place = await searchPlace(placeName, location);
    if (place) {
      const result = {
        isOpen: place.regularOpeningHours?.openNow ?? true, // Default to true if unknown
        hours: place.regularOpeningHours?.weekdayDescriptions?.[0],
        // Return REAL coordinates from Google Places - critical for accurate navigation
        coordinates: place.location ? {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
        } : undefined,
        address: place.formattedAddress,
      };
      console.log('[OpenAI] verifyPlaceOpen found:', {
        name: place.displayName?.text,
        coordinates: result.coordinates,
        isOpen: result.isOpen,
      });
      return result;
    }
    console.log('[OpenAI] verifyPlaceOpen: place not found');
    return null;
  } catch (error) {
    console.log('[OpenAI] verifyPlaceOpen error:', error);
    return null;
  }
}

// Structured response from OpenAI for place recommendations
export interface StructuredChatResponse {
  content: string;
  placeCard?: PlaceCardData;
  inlineMap?: InlineMapData;
  actions?: MessageAction[];
}

/**
 * Build system prompt for chat
 */
function buildSystemPrompt(context: DestinationContext): string {
  // Get actual local time
  const now = new Date();
  const localTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const localDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Build dietary restrictions string (CRITICAL - must emphasize)
  const dietaryRestrictions = context.preferences.dietary?.length
    ? context.preferences.dietary.join(', ').toUpperCase()
    : null;

  // Build interests string
  const userInterests = context.preferences.interests?.length
    ? context.preferences.interests.join(', ')
    : null;

  // Get learned memories from memory store
  const memoryContext = useMemoryStore.getState().getMemoryContext();

  return `You are Tomo, a friendly travel companion. Think of yourself as a local friend in the user's pocket.

CONTEXT:
- Location: ${context.neighborhood || 'Unknown'}
- Time: ${localTime} on ${localDate}
- Weather: ${context.weather?.condition || 'unknown'}, ${context.weather?.temperature || '?'}°
${dietaryRestrictions ? `- DIETARY: ${dietaryRestrictions} (always respect this!)` : ''}
${context.preferences.budget ? `- Budget: ${context.preferences.budget}` : ''}

CORE RULES:
1. BE CONVERSATIONAL - Not every message needs a place recommendation. If someone says "hey" or asks about weather, just chat!
2. ONLY recommend places when user EXPLICITLY asks for food/coffee/things to do/places to go
3. NO MARKDOWN - No asterisks, no bold, no bullets. Plain text only.
4. BE BRIEF - 1-2 sentences max for chat, 2-3 for recommendations
5. ONE recommendation at a time - Don't overwhelm with choices

RESPONSE FORMAT (JSON):
{
  "text": "Your response (plain text, no markdown)",
  "placeCard": null,
  "showMap": false,
  "actions": []
}

ONLY include placeCard when recommending a SPECIFIC place:
{
  "text": "Short reason why this place",
  "placeCard": {
    "name": "Place Name",
    "address": "Address",
    "rating": 4.5,
    "priceLevel": 2,
    "distance": "8 min walk",
    "openNow": true,
    "hours": "9 AM - 10 PM",
    "estimatedCost": "200 THB",
    "coordinates": {"latitude": 18.123, "longitude": 98.456}
  },
  "showMap": true,
  "actions": [{"label": "Take me there", "type": "navigate"}]
}

EXAMPLES OF WHEN placeCard = null:
- "hey tomo" → Just say hi back
- "what's the weather?" → Answer with weather info
- "thanks!" → You're welcome!
- "what time is it?" → Tell them the time
- "translate hello to Thai" → Give translation
- "how are you?" → Chat naturally

EXAMPLES OF WHEN to include placeCard:
- "I'm hungry" → Recommend ONE specific restaurant
- "find me coffee" → Recommend ONE specific cafe
- "what should I do nearby?" → Recommend ONE activity

PLACE RULES:
- Only recommend places OPEN at ${localTime}
- Use real places in ${context.neighborhood || 'the area'}
- Include accurate GPS coordinates${memoryContext}`;
}

/**
 * Parse response for structured content
 * With response_format: json_object, OpenAI always returns valid JSON
 */
function parseStructuredResponse(responseText: string, userLocation: Coordinates): StructuredChatResponse {
  let jsonText = responseText.trim();

  // Handle case where response might be wrapped in code blocks (shouldn't happen with json_object mode)
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonText);

    const result: StructuredChatResponse = {
      content: parsed.text || responseText,
    };

    // Build place card if present and not null
    if (parsed.placeCard && parsed.placeCard.name) {
      result.placeCard = {
        name: parsed.placeCard.name,
        address: parsed.placeCard.address || '',
        rating: parsed.placeCard.rating,
        priceLevel: parsed.placeCard.priceLevel,
        distance: parsed.placeCard.distance,
        openNow: parsed.placeCard.openNow,
        hours: parsed.placeCard.hours,
        estimatedCost: parsed.placeCard.estimatedCost,
        coordinates: parsed.placeCard.coordinates || userLocation,
      };

      // Build inline map if showMap is true and we have coordinates
      if (parsed.showMap && result.placeCard.coordinates) {
        result.inlineMap = {
          center: result.placeCard.coordinates,
          markers: [
            {
              id: 'destination',
              coordinate: result.placeCard.coordinates,
              title: result.placeCard.name,
            },
          ],
        };
      }
    }

    // Add actions if present and non-empty
    if (parsed.actions && Array.isArray(parsed.actions) && parsed.actions.length > 0) {
      result.actions = parsed.actions;
    }

    return result;
  } catch (error) {
    // If JSON parsing fails, return as plain text
    return { content: responseText };
  }
}

/**
 * Chat with OpenAI GPT-4
 * Auto-retries if a recommended place is closed (up to 3 times)
 */
export async function chat(
  message: string,
  context: DestinationContext,
  recentMessages: ChatMessage[] = [],
  image?: string,
  excludePlaces: string[] = [],
  retryCount: number = 0
): Promise<StructuredChatResponse> {
  const MAX_RETRIES = 3;

  try {
    // Check if offline
    if (!checkOnline()) {
      useOfflineStore.getState().queueMessage(message, image);
      return getOfflineResponse();
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      return { content: "OpenAI API key is not configured. Please check your .env file." };
    }

    // Add excluded places to system prompt if retrying
    let systemPrompt = buildSystemPrompt(context);
    if (excludePlaces.length > 0) {
      systemPrompt += `\n\nDO NOT recommend these places (they are closed): ${excludePlaces.join(', ')}. Suggest a DIFFERENT place.`;
    }

    // Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }> = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.slice(-10).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Add current message (with image if present)
    if (image) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${image}`,
            },
          },
          {
            type: 'text',
            text: message,
          },
        ],
      });
    } else {
      messages.push({
        role: 'user',
        content: message,
      });
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 1500,
        temperature: 0.7 + (retryCount * 0.1), // Slightly increase temperature on retries for variety
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the response for structured content
    const result = parseStructuredResponse(content, context.location);

    // Enrich placeCard with real data from Google APIs
    if (result.placeCard && result.placeCard.name) {
      console.log('[OpenAI] Enriching placeCard:', result.placeCard.name);
      console.log('[OpenAI] GPT coordinates:', result.placeCard.coordinates);

      // Verify place is open using Google Places API - also gets REAL coordinates
      try {
        const openStatus = await verifyPlaceOpen(result.placeCard.name, context.location);
        if (openStatus) {
          result.placeCard.openNow = openStatus.isOpen;
          if (openStatus.hours) {
            result.placeCard.hours = openStatus.hours;
          }

          // CRITICAL: Replace GPT's coordinates with REAL coordinates from Google Places
          if (openStatus.coordinates) {
            console.log('[OpenAI] Replacing GPT coords with Google Places coords:', openStatus.coordinates);
            result.placeCard.coordinates = openStatus.coordinates;
          } else {
            console.log('[OpenAI] WARNING: No coordinates from Google Places, keeping GPT coords');
          }

          // Update address with real address from Google
          if (openStatus.address) {
            result.placeCard.address = openStatus.address;
          }

          // If place is closed, silently retry with this place excluded
          if (!openStatus.isOpen && retryCount < MAX_RETRIES) {
            return chat(
              message,
              context,
              recentMessages,
              image,
              [...excludePlaces, result.placeCard.name],
              retryCount + 1
            );
          }

          // If we've exhausted retries, just return text without place card
          if (!openStatus.isOpen) {
            return {
              content: result.content,
            };
          }
        }
      } catch (openError) {
        console.log('[OpenAI] Open status check failed:', openError);
      }

      // Fetch real walking distance/time from Routes API using REAL coordinates
      if (result.placeCard.coordinates) {
        try {
          console.log('[OpenAI] Getting walking directions from:', context.location, 'to:', result.placeCard.coordinates);
          const route = await getWalkingDirections(context.location, result.placeCard.coordinates);
          if (route) {
            const walkMins = Math.round(route.totalDuration);
            console.log('[OpenAI] Walking route result:', { duration: route.totalDuration, distance: route.totalDistance, walkMins });
            result.placeCard.distance = `${walkMins} min walk`;
          } else {
            console.log('[OpenAI] WARNING: No route returned from getWalkingDirections');
          }
        } catch (routeError) {
          console.log('[OpenAI] Route fetch failed:', routeError);
        }
      }

      // Fetch real photos and review count from Google Places
      try {
        const place = await searchPlace(result.placeCard.name, context.location);
        if (place) {
          // Get multiple photos (up to 5)
          if (place.photos && place.photos.length > 0) {
            const photoUrls = place.photos.slice(0, 5).map((p) =>
              buildPhotoUrl(p.name, 600)
            );
            result.placeCard.photos = photoUrls;
            result.placeCard.photo = photoUrls[0];
          }
          // Get review count
          if (place.userRatingCount) {
            result.placeCard.reviewCount = place.userRatingCount;
          }
          // Get accurate rating from Google
          if (place.rating) {
            result.placeCard.rating = place.rating;
          }
        }
      } catch (photoError) {
        // Silently continue if place data fetch fails
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: `Sorry, I'm having trouble responding: ${errorMessage}`,
    };
  }
}

/**
 * Simple chat that returns just a string
 */
export async function chatSimple(
  message: string,
  context: DestinationContext,
  recentMessages: ChatMessage[] = [],
  image?: string
): Promise<string> {
  const response = await chat(message, context, recentMessages, image);
  return response.content;
}

// === ITINERARY GENERATION ===

export interface ItineraryActivityData {
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  startTime?: string;
  endTime?: string;
  title: string;
  description: string;
  category: 'food' | 'culture' | 'activity' | 'transport' | 'rest';
  place?: {
    name: string;
    address: string;
    coordinates: Coordinates;
    rating?: number;
    priceLevel?: number;
    estimatedCost?: string;
  };
  booked: boolean;
  bookingUrl?: string;
}

export interface ItineraryDayData {
  dayNumber: number;
  date: string; // "Day 1", "Day 2", etc.
  activities: ItineraryActivityData[];
}

export interface GeneratedItinerary {
  name: string;
  overview: string;
  totalDays: number;
  days: ItineraryDayData[];
  tips?: string[];
  estimatedBudget?: string;
}

/**
 * Build system prompt for itinerary generation
 */
function buildItinerarySystemPrompt(context: DestinationContext, numDays: number): string {
  const now = new Date();
  const localTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const dietaryRestrictions = context.preferences.dietary?.length
    ? context.preferences.dietary.join(', ').toUpperCase()
    : null;

  const userInterests = context.preferences.interests?.length
    ? context.preferences.interests.join(', ')
    : 'general sightseeing';

  return `You are Tomo, an expert travel planner creating a ${numDays}-day itinerary.

LOCATION: ${context.neighborhood || 'Unknown location'}
CURRENT TIME: ${localTime} (${context.timeOfDay})
WEATHER: ${context.weather?.condition || 'unknown'}, ${context.weather?.temperature || '?'}°
DAILY BUDGET: ${context.dailyBudget}
${dietaryRestrictions ? `⚠️ DIETARY RESTRICTIONS: ${dietaryRestrictions}` : ''}
INTERESTS: ${userInterests}
${context.preferences.avoidCrowds ? 'PREFERENCE: Less crowded places' : ''}
${context.preferences.budget ? `BUDGET LEVEL: ${context.preferences.budget}` : ''}

CREATE AN ITINERARY WITH THESE RULES:

1. STRUCTURE:
   - Each day has 4 time slots: morning, afternoon, evening, night
   - Include 3-4 activities per day (meals count as activities)
   - Cluster activities geographically to minimize travel
   - Balance activity types (don't do 4 temples in a row)

2. TIME-APPROPRIATE ACTIVITIES:
   - Morning (6am-12pm): Temples, markets, breakfast spots, museums
   - Afternoon (12pm-5pm): Lunch, sightseeing, shopping, cultural sites
   - Evening (5pm-9pm): Dinner, sunset spots, entertainment
   - Night (9pm+): Nightlife, night markets, bars (if appropriate)

3. PLACE DATA:
   - Use REAL places that exist in ${context.neighborhood || 'the area'}
   - Include accurate GPS coordinates
   - Include realistic estimated costs in local currency

4. DIETARY:
${dietaryRestrictions ? `   - ALL food suggestions MUST accommodate: ${dietaryRestrictions}` : '   - No restrictions'}

RESPOND WITH VALID JSON:

{
  "name": "My ${context.neighborhood || ''} Adventure",
  "overview": "Brief 1-2 sentence overview of the itinerary",
  "totalDays": ${numDays},
  "days": [
    {
      "dayNumber": 1,
      "date": "Day 1",
      "activities": [
        {
          "timeSlot": "morning",
          "startTime": "08:00",
          "endTime": "10:00",
          "title": "Activity Name",
          "description": "Brief description",
          "category": "culture",
          "place": {
            "name": "Place Name",
            "address": "Full address",
            "coordinates": {"latitude": 18.123, "longitude": 98.456},
            "rating": 4.5,
            "priceLevel": 2,
            "estimatedCost": "200 THB"
          },
          "booked": false,
          "bookingUrl": null
        }
      ]
    }
  ],
  "tips": ["Tip 1", "Tip 2"],
  "estimatedBudget": "1500 THB per day"
}

CATEGORIES: food, culture, activity, transport, rest`;
}

/**
 * Generate an itinerary using OpenAI
 */
export async function generateItinerary(
  context: DestinationContext,
  numDays: number = 3,
  customRequest?: string
): Promise<GeneratedItinerary | null> {
  try {
    // Check if offline
    if (!checkOnline()) {
      return null;
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      return null;
    }

    const systemPrompt = buildItinerarySystemPrompt(context, numDays);

    const userMessage = customRequest
      ? `Plan a ${numDays}-day itinerary with these preferences: ${customRequest}`
      : `Plan a ${numDays}-day itinerary for ${context.neighborhood || 'my current location'}. Make it fun and practical!`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 4000,
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const itinerary = safeJsonParse<GeneratedItinerary>(content, 'generateItinerary');
    if (!itinerary) {
      throw new Error('Failed to parse itinerary JSON');
    }

    // Validate required fields
    if (!itinerary.name || !itinerary.days || !Array.isArray(itinerary.days)) {
      throw new Error('Invalid itinerary structure');
    }

    return itinerary;
  } catch (error) {
    return null;
  }
}

// === SMART NAVIGATION CHAT ===

export interface NavigationContext {
  userLocation: Coordinates;
  destination: {
    name: string;
    address: string;
    coordinates: Coordinates;
  };
  currentStep?: {
    instruction: string;
    distance?: number;
  };
  totalDuration: number; // minutes
  totalDistance: number; // meters
  distanceRemaining: number; // meters
  travelMode: 'WALK' | 'TRANSIT' | 'DRIVE';
  waypoints?: Array<{
    name: string;
    coordinates: Coordinates;
  }>;
}

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  rating?: number;
  distance?: number; // meters from user
  detourTime?: number; // additional minutes if added as stop
  isOpen?: boolean;
}

export interface NavigationChatAction {
  type: 'add_stop' | 'change_destination' | 'show_on_map' | 'call_place' | 'none';
  place?: NearbyPlace;
}

export interface SmartNavigationResponse {
  text: string;
  places?: NearbyPlace[];
  suggestedActions?: Array<{
    label: string;
    type: 'add_stop' | 'change_destination' | 'show_on_map' | 'dismiss';
    placeId?: string;
  }>;
  routeChange?: {
    newEta: string;
    addedTime: number; // minutes
    addedDistance: number; // meters
  };
}

// Legacy interface for backward compatibility
export interface NavigationChatResponse {
  text: string;
  action?: NavigationChatAction;
}

/**
 * Build system prompt for navigation chat
 */
function buildNavigationSystemPrompt(navContext: NavigationContext): string {
  const distanceRemaining = navContext.distanceRemaining < 1000
    ? `${Math.round(navContext.distanceRemaining)} m`
    : `${(navContext.distanceRemaining / 1000).toFixed(1)} km`;

  const eta = Math.round(navContext.totalDuration * (navContext.distanceRemaining / navContext.totalDistance));

  return `You are Tomo, a friendly AI assistant helping a traveler during navigation.

CURRENT NAVIGATION:
- Destination: ${navContext.destination.name}
- Address: ${navContext.destination.address}
- Distance remaining: ${distanceRemaining}
- ETA: ${eta} minutes
- Travel mode: ${navContext.travelMode.toLowerCase()}
${navContext.currentStep ? `- Current step: ${navContext.currentStep.instruction}` : ''}

YOU CAN HELP WITH:
1. Finding nearby places ("find a coffee shop", "where's the nearest bathroom")
2. Adding stops to the route ("add a 7-Eleven stop", "I need to stop for gas")
3. Answering questions about the route ("how much longer", "am I going the right way")
4. General questions while navigating

RESPONSE FORMAT (JSON):
{
  "text": "Your response (conversational, concise)",
  "action": {
    "type": "add_stop" | "find_nearby" | "change_route" | "info" | "none",
    "place": null OR {
      "name": "Place Name",
      "address": "Address",
      "coordinates": {"latitude": X, "longitude": Y}
    }
  }
}

RULES:
- Be concise (user is navigating, keep it brief)
- If user asks to find something nearby, suggest a real place with coordinates
- If asked about remaining time/distance, use the context provided
- Do NOT use markdown formatting
- Be helpful and proactive`;
}

/**
 * Chat during navigation with context about the current route
 */
export async function navigationChat(
  message: string,
  navContext: NavigationContext
): Promise<NavigationChatResponse> {
  try {
    // Check if offline
    if (!checkOnline()) {
      return { text: "I'm offline right now. Keep following the current route - I'll be back when you have connection." };
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      return { text: "Sorry, I can't respond right now. API key not configured." };
    }

    const systemPrompt = buildNavigationSystemPrompt(navContext);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Fast + capable model for navigation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    const parsed = safeJsonParse<{ text?: string; action?: NavigationChatAction }>(content, 'navigationChat');
    if (!parsed) {
      throw new Error('Failed to parse navigation response');
    }

    return {
      text: parsed.text || "I'm not sure how to help with that.",
      action: parsed.action,
    };
  } catch (error) {
    return {
      text: "Sorry, I'm having trouble responding. Try again in a moment.",
    };
  }
}

// === SMART NAVIGATION CHAT WITH PLACE SEARCH ===

/**
 * Detect what type of place the user is looking for
 */
function detectPlaceIntent(message: string): { type: string | null; query: string | null } {
  const lowerMsg = message.toLowerCase();

  // Map common requests to Google Places types
  const placePatterns: Array<{ patterns: RegExp[]; type: string; query: string }> = [
    {
      patterns: [/bathroom|restroom|toilet|wc|loo/],
      type: 'toilet',
      query: 'public restroom',
    },
    {
      patterns: [/coffee|cafe|starbucks|espresso/],
      type: 'cafe',
      query: 'coffee shop',
    },
    {
      patterns: [/7.?11|seven.?eleven|convenience|konbini/],
      type: 'convenience_store',
      query: '7-Eleven convenience store',
    },
    {
      patterns: [/atm|cash|money|withdraw/],
      type: 'atm',
      query: 'ATM',
    },
    {
      patterns: [/gas|petrol|fuel|gas station/],
      type: 'gas_station',
      query: 'gas station',
    },
    {
      patterns: [/pharmacy|drugstore|medicine/],
      type: 'pharmacy',
      query: 'pharmacy',
    },
    {
      patterns: [/food|hungry|eat|restaurant|lunch|dinner|breakfast/],
      type: 'restaurant',
      query: 'restaurant',
    },
    {
      patterns: [/water|drink|thirsty/],
      type: 'convenience_store',
      query: 'convenience store',
    },
    {
      patterns: [/parking|park my car/],
      type: 'parking',
      query: 'parking',
    },
    {
      patterns: [/hotel|stay|sleep|accommodation/],
      type: 'lodging',
      query: 'hotel',
    },
    {
      patterns: [/supermarket|grocery|groceries/],
      type: 'supermarket',
      query: 'supermarket',
    },
    {
      patterns: [/bar|beer|drinks|alcohol|pub/],
      type: 'bar',
      query: 'bar',
    },
  ];

  for (const { patterns, type, query } of placePatterns) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMsg)) {
        return { type, query };
      }
    }
  }

  return { type: null, query: null };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistanceBetween(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (coord1.latitude * Math.PI) / 180;
  const phi2 = (coord2.latitude * Math.PI) / 180;
  const deltaPhi = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLambda = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Estimate walking time in minutes for a given distance
 */
function estimateWalkingTime(meters: number): number {
  // Average walking speed: 5 km/h = 83.33 m/min
  return Math.round(meters / 83.33);
}

/**
 * Build enhanced system prompt for smart navigation chat
 */
function buildSmartNavigationPrompt(
  navContext: NavigationContext,
  nearbyPlaces?: NearbyPlace[]
): string {
  const distanceRemaining = navContext.distanceRemaining < 1000
    ? `${Math.round(navContext.distanceRemaining)} m`
    : `${(navContext.distanceRemaining / 1000).toFixed(1)} km`;

  const etaMinutes = Math.round(
    navContext.totalDuration * (navContext.distanceRemaining / navContext.totalDistance)
  );

  const now = new Date();
  const arrivalTime = new Date(now.getTime() + etaMinutes * 60000);
  const arrivalTimeStr = arrivalTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  let placesContext = '';
  if (nearbyPlaces && nearbyPlaces.length > 0) {
    placesContext = `\n\nNEARBY PLACES FOUND:
${nearbyPlaces.map((p, i) => `${i + 1}. ${p.name} - ${p.distance}m away${p.detourTime ? `, +${p.detourTime} min detour` : ''}${p.rating ? ` (★${p.rating})` : ''}${p.isOpen === false ? ' [CLOSED]' : ''}`).join('\n')}`;
  }

  const waypointsContext = navContext.waypoints && navContext.waypoints.length > 0
    ? `\nCURRENT STOPS: ${navContext.waypoints.map(w => w.name).join(' → ')} → ${navContext.destination.name}`
    : '';

  return `You are Tomo, a smart AI travel companion helping during navigation. Be concise and helpful.

NAVIGATION STATUS:
- Going to: ${navContext.destination.name}
- Distance remaining: ${distanceRemaining}
- ETA: ${etaMinutes} min (arriving ~${arrivalTimeStr})
- Travel mode: ${navContext.travelMode.toLowerCase()}
${navContext.currentStep ? `- Next: ${navContext.currentStep.instruction}` : ''}${waypointsContext}${placesContext}

INSTRUCTIONS:
- If places were found, recommend the best one (consider: distance, rating, open status)
- Always mention the distance and how much time adding a stop would add
- If user wants to add a stop, confirm which place
- Be brief - user is navigating
- Don't use markdown formatting
- If asked "how much longer" or similar, give remaining time and arrival time

RESPONSE FORMAT (JSON):
{
  "text": "Your conversational response",
  "recommendedPlaceIndex": 0 | 1 | 2 | null,
  "intent": "add_stop" | "info" | "change_destination" | "general"
}`;
}

/**
 * Smart navigation chat with integrated place search
 * This is the main function for intelligent in-navigation assistance
 */
export async function smartNavigationChat(
  message: string,
  navContext: NavigationContext,
  searchPlaces: (query: string, coords: Coordinates, type?: string) => Promise<NearbyPlace[]>
): Promise<SmartNavigationResponse> {
  try {
    // Check if offline
    if (!checkOnline()) {
      return {
        text: "I'm offline right now. Keep following the current route!",
      };
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return { text: "Sorry, I can't respond right now." };
    }

    // Detect if user is looking for a place
    const placeIntent = detectPlaceIntent(message);
    let nearbyPlaces: NearbyPlace[] = [];

    // If user is looking for something, search for it
    if (placeIntent.type && placeIntent.query) {
      const searchResults = await searchPlaces(
        placeIntent.query,
        navContext.userLocation,
        placeIntent.type
      );

      // Calculate distance and detour time for each place
      nearbyPlaces = searchResults.slice(0, 3).map((place) => {
        const distanceFromUser = Math.round(
          calculateDistanceBetween(navContext.userLocation, place.coordinates)
        );
        const distanceToDestination = calculateDistanceBetween(
          place.coordinates,
          navContext.destination.coordinates
        );
        const directDistance = navContext.distanceRemaining;

        // Detour = (user→place + place→dest) - direct
        const detourDistance = distanceFromUser + distanceToDestination - directDistance;
        const detourTime = estimateWalkingTime(Math.max(0, detourDistance));

        return {
          ...place,
          distance: distanceFromUser,
          detourTime: detourTime > 0 ? detourTime : 1, // At least 1 min for the stop itself
        };
      });
    }

    // Build prompt with context
    const systemPrompt = buildSmartNavigationPrompt(navContext, nearbyPlaces);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 300,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    const parsed = safeJsonParse<{
      text?: string;
      recommendedPlaceIndex?: number;
      intent?: string;
    }>(content, 'smartNavigationChat');

    if (!parsed) {
      throw new Error('Failed to parse response');
    }

    // Build response with action buttons if places were found
    const result: SmartNavigationResponse = {
      text: parsed.text || "I'm not sure how to help with that.",
    };

    if (nearbyPlaces.length > 0) {
      result.places = nearbyPlaces;

      // Generate action buttons for the recommended place
      const recommendedIndex = parsed.recommendedPlaceIndex ?? 0;
      const recommendedPlace = nearbyPlaces[recommendedIndex];

      if (recommendedPlace) {
        result.suggestedActions = [
          {
            label: `Add stop (+${recommendedPlace.detourTime} min)`,
            type: 'add_stop',
            placeId: recommendedPlace.id,
          },
          {
            label: 'Go there instead',
            type: 'change_destination',
            placeId: recommendedPlace.id,
          },
          {
            label: 'Show on map',
            type: 'show_on_map',
            placeId: recommendedPlace.id,
          },
        ];

        result.routeChange = {
          newEta: formatArrivalTime(
            navContext.totalDuration *
              (navContext.distanceRemaining / navContext.totalDistance) +
              recommendedPlace.detourTime!
          ),
          addedTime: recommendedPlace.detourTime!,
          addedDistance: recommendedPlace.distance! * 2, // Rough estimate
        };
      }
    }

    return result;
  } catch (error) {
    return {
      text: "Sorry, I'm having trouble responding. Try again in a moment.",
    };
  }
}

/**
 * Format arrival time from minutes
 */
function formatArrivalTime(minutes: number): string {
  const arrival = new Date();
  arrival.setMinutes(arrival.getMinutes() + Math.round(minutes));
  return arrival.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Check if a message is asking for itinerary/planning
 */
export function isItineraryRequest(message: string): { isItinerary: boolean; days?: number } {
  const lowerMessage = message.toLowerCase();

  // Common patterns for itinerary requests
  const itineraryPatterns = [
    /plan\s+(my|a|the)?\s*(\d+)?\s*day/i,
    /(\d+)\s*day\s*(itinerary|plan|trip)/i,
    /what\s+should\s+i\s+do\s+(today|tomorrow|this\s+week)/i,
    /plan\s+(today|tomorrow|my\s+day)/i,
    /itinerary\s+for\s+(\d+)\s*days?/i,
    /help\s+me\s+plan/i,
  ];

  for (const pattern of itineraryPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      // Try to extract number of days
      const daysMatch = lowerMessage.match(/(\d+)\s*day/i);
      const days = daysMatch ? parseInt(daysMatch[1]) : 1;

      return { isItinerary: true, days: Math.min(days, 7) }; // Max 7 days
    }
  }

  return { isItinerary: false };
}

// === ITINERARY MODIFICATION ===

export interface ItineraryModificationResult {
  action: 'add' | 'remove' | 'move' | 'update' | 'none';
  message: string;
  activityData?: {
    title: string;
    description: string;
    timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
    category: 'food' | 'culture' | 'activity' | 'transport' | 'rest';
    place?: {
      name: string;
      address: string;
      coordinates: Coordinates;
      rating?: number;
      priceLevel?: number;
    };
    dayIndex?: number; // Which day to add/modify
  };
  removeActivityId?: string;
  moveDetails?: {
    activityId: string;
    newTimeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
    newDayIndex?: number;
  };
}

/**
 * Build system prompt for itinerary modifications
 */
function buildItineraryModificationPrompt(
  currentItinerary: { name: string; days: { date: number; activities: { id: string; title: string; timeSlot: string; description: string }[] }[] },
  neighborhood: string
): string {
  // Format current itinerary for AI
  const itineraryDescription = currentItinerary.days.map((day, index) => {
    const activities = day.activities.map(a => `  - [${a.id}] ${a.timeSlot}: ${a.title}`).join('\n');
    return `Day ${index + 1}:\n${activities || '  (no activities)'}`;
  }).join('\n\n');

  return `You are Tomo, helping modify a travel itinerary.

CURRENT ITINERARY: "${currentItinerary.name}"
LOCATION: ${neighborhood}

${itineraryDescription}

USER WANTS TO MODIFY THIS ITINERARY. Determine what action to take:

1. ADD - User wants to add a new activity
2. REMOVE - User wants to remove an existing activity (use activity ID from above)
3. MOVE - User wants to reschedule an activity
4. UPDATE - User wants to change details of an activity
5. NONE - User is asking a question or unclear request

RESPOND WITH VALID JSON:
{
  "action": "add" | "remove" | "move" | "update" | "none",
  "message": "Your friendly response explaining what you did",
  "activityData": null OR {
    "title": "Activity Name",
    "description": "Brief description",
    "timeSlot": "morning" | "afternoon" | "evening" | "night",
    "category": "food" | "culture" | "activity" | "transport" | "rest",
    "place": {
      "name": "Place Name",
      "address": "Address",
      "coordinates": {"latitude": X, "longitude": Y}
    } OR null,
    "dayIndex": 0
  },
  "removeActivityId": null OR "activity-id-to-remove",
  "moveDetails": null OR {
    "activityId": "activity-id",
    "newTimeSlot": "morning" | "afternoon" | "evening" | "night",
    "newDayIndex": 0
  }
}

RULES:
- For ADD, suggest real places in ${neighborhood} with coordinates
- For REMOVE, match user's description to activity IDs
- Be conversational in message, confirm what you did
- dayIndex is 0-based (Day 1 = index 0)`;
}

/**
 * Modify itinerary based on user request
 */
export async function modifyItinerary(
  userMessage: string,
  currentItinerary: { name: string; days: { date: number; activities: { id: string; title: string; timeSlot: string; description: string }[] }[] },
  neighborhood: string
): Promise<ItineraryModificationResult> {
  try {
    // Check if offline
    if (!checkOnline()) {
      return {
        action: 'none',
        message: "I'm offline right now. I'll help modify your itinerary when you're back online.",
      };
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      return {
        action: 'none',
        message: "Sorry, I can't make changes right now. API not configured.",
      };
    }

    const systemPrompt = buildItineraryModificationPrompt(currentItinerary, neighborhood);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Fast + capable model for modifications
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 800,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[OpenAI] Itinerary modification error:', response.status, errorBody);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    const result = safeJsonParse<ItineraryModificationResult>(content, 'modifyItinerary');
    if (!result) {
      throw new Error('Failed to parse modification result');
    }

    return result;
  } catch (error) {
    return {
      action: 'none',
      message: "Sorry, I couldn't understand that request. Try being more specific, like 'add dinner at 7pm' or 'remove the temple visit'.",
    };
  }
}

// === TRIP SUMMARY ===

/**
 * Trip summary result from AI
 */
export interface TripSummaryResult {
  summary: string;         // 2-3 sentence natural language summary
  highlights: string[];    // Key highlights (3-5 items)
  favoritePlace?: string;  // Best place based on data
  travelStyle?: string;    // Assessed travel style
}

/**
 * Generate an AI-powered trip summary
 */
export async function generateTripSummary(tripData: {
  name: string;
  days: number;
  cities: Array<{
    name: string;
    country: string;
    visits: Array<{ name: string; neighborhood: string }>;
    totalExpenses: number;
  }>;
  totalPlaces: number;
  totalExpenses: number;
  currency: string;
}): Promise<TripSummaryResult | null> {
  try {
    // Check if offline
    if (!checkOnline()) {
      return null;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return null;
    }

    // Build trip context
    const citiesSummary = tripData.cities.map(city => {
      const placesList = city.visits.slice(0, 5).map(v => v.name).join(', ');
      return `${city.name}, ${city.country}: ${city.visits.length} places (${placesList}${city.visits.length > 5 ? '...' : ''})`;
    }).join('\n');

    const prompt = `You are Tomo, analyzing a completed trip. Generate a warm, personalized summary.

TRIP DATA:
- Trip: ${tripData.name}
- Duration: ${tripData.days} days
- Cities: ${tripData.cities.length}
- Total places visited: ${tripData.totalPlaces}
- Total spent: ${tripData.currency}${tripData.totalExpenses.toLocaleString()}

CITIES & PLACES:
${citiesSummary}

Generate a JSON response with:
1. "summary": A warm 2-3 sentence summary of their trip (mention specific places/experiences)
2. "highlights": Array of 3-5 key highlights (short phrases)
3. "favoritePlace": The place that seemed most significant (based on being mentioned or context)
4. "travelStyle": One phrase describing their travel style (e.g., "foodie explorer", "culture enthusiast", "adventurous walker")

Be specific - mention actual place names and neighborhoods from the data.
Keep summary conversational and warm, like a friend reflecting on shared memories.`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Fast + capable
        messages: [
          { role: 'system', content: 'You generate trip summaries in JSON format. Be warm and specific.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    const result = safeJsonParse<TripSummaryResult>(content, 'generateTripSummary');
    if (!result) {
      throw new Error('Failed to parse trip summary');
    }

    return result;
  } catch (error) {
    return null;
  }
}
