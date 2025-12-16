import { DestinationContext, ChatMessage, PlaceCardData, InlineMapData, MessageAction, Coordinates } from '../types';
import { getPlacePhotoUrl, searchPlace } from './places';
import { getWalkingDirections } from './routes';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Get API key from environment
const getApiKey = () => process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

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
2. When suggesting places: ONLY suggest places that are OPEN right now (it's ${localTime})
3. Do NOT use markdown formatting (no **bold**, no *italic*, no bullet points with -)
4. Use plain text with line breaks for formatting
5. Use LOCAL CURRENCY for all prices (user is in ${context.neighborhood || 'their location'})
6. Be conversational, warm, and helpful like a knowledgeable friend
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
    {"label": "Something else", "type": "regenerate"}
  ]
}

WHEN TO INCLUDE placeCard:
- Restaurant, cafe, bar, attraction recommendations: Include placeCard with real place data
- General questions, tips, translations, advice: Set placeCard to null

PLACE RULES:
- ONLY suggest places that are OPEN at ${localTime}
- Use REAL places that actually exist in ${context.neighborhood || 'the area'}
- Include accurate GPS coordinates (critical for navigation)
- priceLevel: 1=cheap, 2=moderate, 3=expensive, 4=luxury`;
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

          // If place is closed, add a warning to the response
          if (!openStatus.isOpen) {
            result.content = `Note: ${result.placeCard.name} appears to be closed right now.\n\n${result.content}`;
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

      // Fetch real photo from Google Places
      try {
        console.log('[OpenAI] Fetching real photo for:', result.placeCard.name);
        const photoUrl = await getPlacePhotoUrl(
          result.placeCard.name,
          context.location,
          600
        );
        if (photoUrl) {
          result.placeCard.photo = photoUrl;
          console.log('[OpenAI] Photo URL fetched successfully');
        }
      } catch (photoError) {
        console.error('[OpenAI] Error fetching place photo:', photoError);
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
