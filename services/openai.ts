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
function safeJsonParse<T>(text: string, context: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`[OpenAI] JSON parse error in ${context}:`, error);
    console.error(`[OpenAI] Raw content: ${text.substring(0, 200)}...`);
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
): Promise<{ isOpen: boolean; hours?: string } | null> {
  try {
    const place = await searchPlace(placeName, location);
    if (place) {
      return {
        isOpen: place.regularOpeningHours?.openNow ?? true, // Default to true if unknown
        hours: place.regularOpeningHours?.weekdayDescriptions?.[0],
      };
    }
    return null;
  } catch (error) {
    console.error('[OpenAI] Error verifying place open status:', error);
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

  return `You are Tomo, a friendly AI assistant that can help with ANYTHING - but you have travel superpowers.

WHO YOU ARE:
- A general-purpose AI assistant (like ChatGPT) that can answer ANY question
- BUT with special awareness of the user's location, time, weather, and budget
- Like having a knowledgeable local friend who can also discuss philosophy, translate text, explain history, give advice, etc.

CURRENT CONTEXT:
- Location: ${context.neighborhood || 'Unknown location'}
- Local time: ${localTime} (${context.timeOfDay}) on ${localDate}
- Weather: ${context.weather?.condition || 'unknown'}, ${context.weather?.temperature || '?'}°
- Budget remaining today: ${context.budgetRemaining}
- Walking today: ${context.totalWalkingToday} minutes
${dietaryRestrictions ? `\n⚠️ DIETARY RESTRICTIONS: ${dietaryRestrictions} - YOU MUST respect these when suggesting food!` : ''}
${userInterests ? `- Interests: ${userInterests}` : ''}
${context.preferences.avoidCrowds ? '- Prefers: Less crowded, off-the-beaten-path places' : ''}
${context.preferences.budget ? `- Budget level: ${context.preferences.budget}` : ''}

CRITICAL RULES:
1. You can answer ANY question - travel, general knowledge, translations, advice, coding, anything
2. PLACES MUST BE OPEN: Only suggest places that are OPEN right now (it's ${localTime}). Check typical hours before recommending!
3. FORMATTING: No markdown! No **bold**, no *italic*, no bullet points, no asterisks. Plain text only.
4. BREVITY: Keep responses SHORT - 1-2 sentences for simple questions, 2-3 sentences max for recommendations
5. Use LOCAL CURRENCY for all prices (user is in ${context.neighborhood || 'their location'})
6. Be conversational and friendly, like a local friend giving advice
${dietaryRestrictions ? `7. DIETARY: User is ${dietaryRestrictions} - NEVER suggest places that cannot accommodate this` : ''}

YOUR PERSONALITY:
- Friendly, helpful, concise like a knowledgeable local friend
- Practical (considers budget, time, weather, energy levels)
- Proactive about useful tips
- Never robotic or formal

RESPONSE FORMAT (ALWAYS respond with valid JSON):

{
  "text": "Your conversational response here (NO markdown, just plain text)",
  "placeCard": null OR {
    "name": "Place Name",
    "address": "Full address",
    "rating": 4.5,
    "priceLevel": 2,
    "distance": "8 min walk",
    "openNow": true,
    "hours": "9 AM - 10 PM",
    "estimatedCost": "200 THB",
    "coordinates": {"latitude": 18.123, "longitude": 98.456}
  },
  "showMap": true/false,
  "actions": [] OR [
    {"label": "Take me there", "type": "navigate"},
    {"label": "Something else", "type": "regenerate"},
    {"label": "Add to itinerary", "type": "add_to_itinerary"}
  ]
}

WHEN TO INCLUDE placeCard:
- Restaurant, cafe, bar, attraction recommendations: Include placeCard with real place data
- General questions, tips, translations, advice: Set placeCard to null

PLACE RULES:
- ONLY suggest places that are OPEN at ${localTime}
- Use REAL places that actually exist in ${context.neighborhood || 'the area'}
- Include accurate GPS coordinates (critical for navigation)
- priceLevel: 1=cheap, 2=moderate, 3=expensive, 4=luxury${memoryContext}`;
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

    console.log('[OpenAI] Parsed structured response:', {
      hasText: !!result.content,
      hasPlaceCard: !!result.placeCard,
      hasMap: !!result.inlineMap,
      actionsCount: result.actions?.length || 0,
    });

    return result;
  } catch (error) {
    // If JSON parsing fails (shouldn't happen with json_object mode), return as plain text
    console.warn('[OpenAI] Failed to parse JSON response:', error);
    console.log('[OpenAI] Raw response:', responseText.substring(0, 200));
    return { content: responseText };
  }
}

/**
 * Chat with OpenAI GPT-4
 */
export async function chat(
  message: string,
  context: DestinationContext,
  recentMessages: ChatMessage[] = [],
  image?: string
): Promise<StructuredChatResponse> {
  try {
    // Check if offline
    if (!checkOnline()) {
      console.log('[OpenAI] Offline - returning cached response');
      // Queue the message for later
      useOfflineStore.getState().queueMessage(message, image);
      return getOfflineResponse();
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      console.error('[OpenAI] No API key configured!');
      return { content: "OpenAI API key is not configured. Please check your .env file." };
    }

    console.log('[OpenAI] API key present, length:', apiKey.length);

    const systemPrompt = buildSystemPrompt(context);

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
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[OpenAI] API error:', response.status, errorBody);
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
    if (result.placeCard && result.placeCard.name && result.placeCard.coordinates) {
      // Verify place is open using Google Places API
      try {
        console.log('[OpenAI] Verifying open status for:', result.placeCard.name);
        const openStatus = await verifyPlaceOpen(result.placeCard.name, context.location);
        if (openStatus) {
          result.placeCard.openNow = openStatus.isOpen;
          if (openStatus.hours) {
            result.placeCard.hours = openStatus.hours;
          }
          console.log('[OpenAI] Place open status:', openStatus.isOpen ? 'OPEN' : 'CLOSED');

          // If place is closed, DON'T show it - return a message asking to try again
          if (!openStatus.isOpen) {
            console.log('[OpenAI] Place is closed, removing from response');
            return {
              content: `${result.placeCard.name} is actually closed right now. Ask me again and I'll find you somewhere that's open!`,
            };
          }
        }
      } catch (openError) {
        console.error('[OpenAI] Error verifying open status:', openError);
      }

      // Fetch real walking distance/time from Routes API (fixes distance mismatch!)
      try {
        const gptGuessedDistance = result.placeCard.distance;
        console.log('[OpenAI] Fetching real walking distance for:', result.placeCard.name);
        const route = await getWalkingDirections(context.location, result.placeCard.coordinates);
        if (route) {
          const walkMins = Math.round(route.totalDuration);
          result.placeCard.distance = `${walkMins} min walk`;
          console.log('[OpenAI] Real walking time:', walkMins, 'min (GPT guessed:', gptGuessedDistance, ')');
        }
      } catch (routeError) {
        console.error('[OpenAI] Error fetching walking distance:', routeError);
      }

      // Fetch real photos and review count from Google Places
      try {
        console.log('[OpenAI] Fetching place data for:', result.placeCard.name);
        const place = await searchPlace(result.placeCard.name, context.location);
        if (place) {
          // Get multiple photos (up to 5)
          if (place.photos && place.photos.length > 0) {
            const photoUrls = place.photos.slice(0, 5).map((p) =>
              buildPhotoUrl(p.name, 600)
            );
            result.placeCard.photos = photoUrls;
            result.placeCard.photo = photoUrls[0]; // Also set single photo for backward compatibility
            console.log('[OpenAI] Fetched', photoUrls.length, 'photos');
          }
          // Get review count
          if (place.userRatingCount) {
            result.placeCard.reviewCount = place.userRatingCount;
            console.log('[OpenAI] Review count:', place.userRatingCount);
          }
          // Get accurate rating from Google
          if (place.rating) {
            result.placeCard.rating = place.rating;
          }
        }
      } catch (photoError) {
        console.error('[OpenAI] Error fetching place data:', photoError);
      }
    }

    return result;
  } catch (error) {
    console.error('[OpenAI] Chat error:', error);
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
      console.log('[OpenAI] Offline - cannot generate itinerary');
      return null;
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      console.error('[OpenAI] No API key configured!');
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
      const errorBody = await response.text();
      console.error('[OpenAI] Itinerary API error:', response.status, errorBody);
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
      console.error('[OpenAI] Invalid itinerary structure:', itinerary);
      throw new Error('Invalid itinerary structure');
    }

    console.log('[OpenAI] Generated itinerary:', {
      name: itinerary.name,
      days: itinerary.totalDays,
      activitiesPerDay: itinerary.days.map(d => d.activities?.length || 0),
    });

    return itinerary;
  } catch (error) {
    console.error('[OpenAI] Itinerary generation error:', error);
    return null;
  }
}

// === NAVIGATION CHAT ===

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
}

export interface NavigationChatAction {
  type: 'add_stop' | 'find_nearby' | 'change_route' | 'info' | 'none';
  place?: {
    name: string;
    address: string;
    coordinates: Coordinates;
  };
}

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
      const errorBody = await response.text();
      console.error('[OpenAI] Navigation chat error:', response.status, errorBody);
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

    console.log('[OpenAI] Navigation chat response:', {
      text: parsed.text?.substring(0, 50),
      actionType: parsed.action?.type,
    });

    return {
      text: parsed.text || "I'm not sure how to help with that.",
      action: parsed.action,
    };
  } catch (error) {
    console.error('[OpenAI] Navigation chat error:', error);
    return {
      text: "Sorry, I'm having trouble responding. Try again in a moment.",
    };
  }
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

    console.log('[OpenAI] Itinerary modification result:', {
      action: result.action,
      message: result.message?.substring(0, 50),
    });

    return result;
  } catch (error) {
    console.error('[OpenAI] Itinerary modification error:', error);
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
      console.log('[OpenAI] Offline - returning null for trip summary');
      return null;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      console.log('[OpenAI] No API key for trip summary');
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
      const errorBody = await response.text();
      console.error('[OpenAI] Trip summary error:', response.status, errorBody);
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

    console.log('[OpenAI] Trip summary generated:', {
      summaryLength: result.summary?.length,
      highlightsCount: result.highlights?.length,
    });

    return result;
  } catch (error) {
    console.error('[OpenAI] Trip summary error:', error);
    return null;
  }
}
