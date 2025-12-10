import { Destination, DestinationContext, Coordinates, ChatMessage, PlaceCardData, InlineMapData, MessageAction } from '../types';
import { config } from '../constants/config';
import { searchPlace, placeToSpot, searchNearby, getPlacePhotoUrl } from './places';
import { getApiErrorMessage } from '../utils/setupCheck';

// Structured response from Claude for place recommendations
export interface StructuredChatResponse {
  content: string;
  placeCard?: PlaceCardData;
  inlineMap?: InlineMapData;
  actions?: MessageAction[];
}

/**
 * Parse Claude's response for structured JSON content
 */
function parseStructuredResponse(responseText: string, userLocation: Coordinates): StructuredChatResponse {
  // Try to extract JSON from the response
  let jsonText = responseText.trim();

  // Check for JSON code blocks
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  } else if (responseText.trim().startsWith('{')) {
    // Direct JSON response
    jsonText = responseText.trim();
  } else {
    // Plain text response
    return { content: responseText };
  }

  try {
    const parsed = JSON.parse(jsonText);

    const result: StructuredChatResponse = {
      content: parsed.text || responseText,
    };

    // Build place card if present
    if (parsed.placeCard) {
      result.placeCard = {
        name: parsed.placeCard.name,
        address: parsed.placeCard.address,
        rating: parsed.placeCard.rating,
        priceLevel: parsed.placeCard.priceLevel,
        distance: parsed.placeCard.distance,
        openNow: parsed.placeCard.openNow,
        hours: parsed.placeCard.hours,
        estimatedCost: parsed.placeCard.estimatedCost,
        coordinates: parsed.placeCard.coordinates || userLocation,
      };
    }

    // Build inline map if requested
    if (parsed.showMap && parsed.placeCard?.coordinates) {
      result.inlineMap = {
        center: parsed.placeCard.coordinates,
        markers: [
          {
            id: 'destination',
            coordinate: parsed.placeCard.coordinates,
            title: parsed.placeCard.name,
          },
        ],
      };
    }

    // Add actions if present
    if (parsed.actions && Array.isArray(parsed.actions)) {
      result.actions = parsed.actions;
    }

    return result;
  } catch (error) {
    // If JSON parsing fails, return plain text
    console.log('[Claude] Response is not structured JSON, returning as plain text');
    return { content: responseText };
  }
}

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Generate ONE contextual destination suggestion
 */
export async function generateDestination(
  context: DestinationContext
): Promise<Destination | null> {
  try {
    const prompt = buildDestinationPrompt(context);

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const message = await response.json();
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse the JSON response (strip markdown code fences if present)
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const destinationData = JSON.parse(jsonText);

    // Enrich with Google Places data
    const enrichedDestination = await enrichDestination(
      destinationData,
      context.location
    );

    return enrichedDestination;
  } catch (error) {
    const errorMsg = getApiErrorMessage(error, 'Claude AI');
    console.error('Error generating destination:', errorMsg, error);
    return null;
  }
}

/**
 * Build the prompt for destination generation
 */
function buildDestinationPrompt(context: DestinationContext): string {
  const timeEmoji = getTimeEmoji(context.timeOfDay);
  const weatherEmoji = getWeatherEmoji(context.weather?.condition);

  return `You are Tomo, an AI travel companion. Generate ONE perfect destination for the user right now.

CONTEXT:
📍 Location: ${context.neighborhood || 'Unknown'}
${timeEmoji} Time: ${context.timeOfDay}
${weatherEmoji} Weather: ${context.weather?.condition || 'unknown'}, ${context.weather?.temperature}°C
💰 Budget: ¥${context.budgetRemaining} remaining (daily budget: ¥${context.dailyBudget})
🚶 Walking: ${context.totalWalkingToday} minutes today

PREFERENCES:
${context.preferences.dietary.length > 0 ? `Dietary: ${context.preferences.dietary.join(', ')}` : ''}
Interests: ${context.preferences.interests.join(', ')}
${context.preferences.avoidCrowds ? 'Avoids crowds' : ''}

VISITED TODAY:
${context.visitedPlaces.slice(-3).map(v => `- ${v.name}`).join('\n') || '(none)'}

EXCLUDED:
${context.excludedToday.map(id => `- ${id}`).join('\n') || '(none)'}

TASK:
Generate ONE destination that is:
1. Perfect for RIGHT NOW (time, weather, energy level)
2. Within budget
3. Not already visited today
4. Not excluded
5. Actually exists and is accessible

Return ONLY a JSON object with this structure:
{
  "id": "unique-id",
  "title": "Destination Name",
  "description": "One-line summary",
  "whatItIs": "2-3 sentences explaining what this place is",
  "whenToGo": "Specific timing advice",
  "neighborhood": "Area name",
  "category": "food|culture|nightlife|nature|shopping|iconic",
  "whyNow": "Why this is perfect right now (weather, time, etc)",
  "address": "Full address",
  "coordinates": {"latitude": 35.xxx, "longitude": 139.xxx},
  "priceLevel": 1-4,
  "estimatedCost": number in yen,
  "transitPreview": {
    "method": "walk|train|bus",
    "line": "Line name if train/bus",
    "totalMinutes": number,
    "description": "e.g. '15 min by train'"
  },
  "spots": [
    {
      "name": "Specific place name",
      "description": "Why this spot is good"
    }
  ]
}

IMPORTANT:
- Use REAL places that actually exist in ${context.neighborhood || 'the current location'}
- Be specific (not generic)
- Consider the user's energy level (walking time)
- Match their budget
- Factor in weather (indoor if raining)
- Time-appropriate (don't suggest breakfast spots at night)
- Include 2-3 "spots you might like" within the destination

Return ONLY the JSON, no other text.`;
}

/**
 * Enrich destination with Google Places data
 */
async function enrichDestination(
  rawDestination: any,
  userLocation: Coordinates
): Promise<Destination> {
  try {
    // Search for the main destination place
    const mainPlace = await searchPlace(
      `${rawDestination.title} ${rawDestination.neighborhood}`,
      userLocation
    );

    // Enrich spots with real Google Places data
    const enrichedSpots = await Promise.all(
      rawDestination.spots.map(async (spot: any) => {
        const results = await searchNearby(
          rawDestination.coordinates,
          spot.name,
          undefined,
          500
        );

        if (results.length > 0) {
          return placeToSpot(results[0], spot.description);
        }

        // Fallback if not found
        return {
          placeId: `mock_${spot.name.replace(/\s/g, '_')}`,
          name: spot.name,
          description: spot.description,
        };
      })
    );

    return {
      ...rawDestination,
      placeId: mainPlace?.id,
      photos: mainPlace?.photos?.map((p) => p.name),
      rating: mainPlace?.rating,
      hours: mainPlace?.regularOpeningHours?.weekdayDescriptions?.join('\n'),
      isOpen: mainPlace?.regularOpeningHours?.openNow,
      spots: enrichedSpots,
    };
  } catch (error) {
    console.error('Error enriching destination:', error);
    // Return un-enriched destination if enrichment fails
    return rawDestination as Destination;
  }
}

/**
 * Chat with Claude (with optional image)
 * Returns structured response with optional place card, map, and actions
 */
export async function chat(
  message: string,
  context: DestinationContext,
  recentMessages: ChatMessage[] = [],
  image?: string
): Promise<StructuredChatResponse> {
  try {
    const systemPrompt = buildChatSystemPrompt(context);

    const messages: Array<{
      role: 'user' | 'assistant';
      content: any;
    }> = [
      ...recentMessages
        .slice(-10) // Last 10 messages for context
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      {
        role: 'user' as const,
        content: image
          ? [
              {
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: 'image/jpeg' as const,
                  data: image,
                },
              },
              {
                type: 'text' as const,
                text: message,
              },
            ]
          : message,
      },
    ];

    const chatResponse = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages,
      }),
    });

    if (!chatResponse.ok) {
      throw new Error(`Claude API error: ${chatResponse.status}`);
    }

    const chatMessage: any = await chatResponse.json();
    const content = chatMessage.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse the response for structured content
    const response = parseStructuredResponse(content.text, context.location);

    // Enrich placeCard with real photo from Google Places if present
    if (response.placeCard && response.placeCard.name) {
      try {
        console.log('[Claude] Fetching real photo for:', response.placeCard.name);
        const photoUrl = await getPlacePhotoUrl(
          response.placeCard.name,
          context.location,
          600 // Higher res for card display
        );
        if (photoUrl) {
          response.placeCard.photo = photoUrl;
          console.log('[Claude] Photo URL fetched successfully');
        } else {
          console.log('[Claude] No photo found for place');
        }
      } catch (photoError) {
        console.error('[Claude] Error fetching place photo:', photoError);
        // Continue without photo - not critical
      }
    }

    return response;
  } catch (error) {
    console.error('Error in chat:', error);
    return {
      content: "Sorry, I'm having trouble responding right now. Please try again.",
    };
  }
}

/**
 * Simple chat that returns just a string (for backward compatibility)
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

/**
 * Build system prompt for chat
 */
function buildChatSystemPrompt(context: DestinationContext): string {
  return `You are Tomo, an AI travel companion helping a user explore ${context.neighborhood || 'their current location'}.

CURRENT CONTEXT:
- Location: ${context.neighborhood || 'Unknown'}
- Time: ${context.timeOfDay}
- Weather: ${context.weather?.condition || 'unknown'}, ${context.weather?.temperature || '?'}°C
- Budget remaining today: ${context.budgetRemaining}
- Walking today: ${context.totalWalkingToday} minutes

YOUR PERSONALITY:
- Friendly, helpful, concise
- Local expert who knows hidden gems
- Practical (considers budget, time, weather)
- Proactive about useful context

RESPONSE FORMAT RULES:

1. FOR PLACE RECOMMENDATIONS (restaurants, cafes, bars, attractions, shops, etc.):
   You MUST respond with ONLY a JSON object wrapped in \`\`\`json markers. No text before or after.

   Example:
   \`\`\`json
   {
     "text": "I know a perfect spot! This tiny ramen shop is legendary among locals.",
     "placeCard": {
       "name": "Ichiran Ramen Shibuya",
       "address": "1-22-7 Jinnan, Shibuya",
       "rating": 4.5,
       "priceLevel": 2,
       "distance": "8 min walk",
       "openNow": true,
       "hours": "11 AM - 2 AM",
       "estimatedCost": "¥1,200",
       "coordinates": {"latitude": 35.6614, "longitude": 139.6993}
     },
     "showMap": true,
     "actions": [
       {"label": "Take me there", "type": "navigate"},
       {"label": "Something else", "type": "regenerate"}
     ]
   }
   \`\`\`

2. FOR GENERAL QUESTIONS (directions, tips, "what should I know", translation, etc.):
   Respond with plain text only. No JSON, no code blocks.

3. FOR PHOTO ANALYSIS:
   - Translate any text you see
   - Explain what it is
   - Give actionable advice
   - Use plain text response

PLACE RECOMMENDATION REQUIREMENTS:
- Use REAL places that actually exist in ${context.neighborhood || 'the area'}
- Include accurate GPS coordinates (latitude/longitude)
- Estimate walking distance from user's current location
- Use LOCAL CURRENCY for estimatedCost
- Consider: time of day, weather, their budget, walking tolerance
- priceLevel: 1=cheap, 2=moderate, 3=expensive, 4=luxury
- Always include both "Take me there" and "Something else" actions

TRIGGER WORDS for JSON response: "find me", "recommend", "where can I", "I want to eat", "hungry", "thirsty", "coffee", "food", "restaurant", "bar", "cafe", "shop", "attraction", "things to do", "what's nearby"

Remember: For place recommendations, your ENTIRE response must be the JSON block. Nothing else.`;
}

/**
 * Helper: Get time emoji
 */
function getTimeEmoji(timeOfDay: string): string {
  switch (timeOfDay) {
    case 'morning':
      return '🌅';
    case 'afternoon':
      return '☀️';
    case 'evening':
      return '🌆';
    case 'night':
      return '🌙';
    default:
      return '🕐';
  }
}

/**
 * Helper: Get weather emoji
 */
function getWeatherEmoji(condition?: string): string {
  switch (condition) {
    case 'clear':
      return '☀️';
    case 'cloudy':
      return '☁️';
    case 'rain':
      return '🌧️';
    case 'snow':
      return '❄️';
    default:
      return '🌤️';
  }
}
