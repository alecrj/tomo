import { Destination, DestinationContext, Coordinates, ChatMessage } from '../types';
import { config } from '../constants/config';
import { searchPlace, placeToSpot, searchNearby } from './places';

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
      throw new Error(`Claude API error: ${response.status}`);
    }

    const message = await response.json();
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse the JSON response
    const destinationData = JSON.parse(content.text);

    // Enrich with Google Places data
    const enrichedDestination = await enrichDestination(
      destinationData,
      context.location
    );

    return enrichedDestination;
  } catch (error) {
    console.error('Error generating destination:', error);
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
- Use REAL places that actually exist in Tokyo
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
 */
export async function chat(
  message: string,
  context: DestinationContext,
  recentMessages: ChatMessage[] = [],
  image?: string
): Promise<string> {
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
        max_tokens: 1000,
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

    return content.text;
  } catch (error) {
    console.error('Error in chat:', error);
    return "Sorry, I'm having trouble responding right now. Please try again.";
  }
}

/**
 * Build system prompt for chat
 */
function buildChatSystemPrompt(context: DestinationContext): string {
  return `You are Tomo, an AI travel companion helping a user explore Tokyo.

CURRENT CONTEXT:
- Location: ${context.neighborhood || 'Unknown'}
- Time: ${context.timeOfDay}
- Weather: ${context.weather?.condition}, ${context.weather?.temperature}°C
- Budget remaining: ¥${context.budgetRemaining}
- Walking today: ${context.totalWalkingToday} minutes

Be:
- Specific and actionable
- Concise (2-3 sentences max)
- Context-aware (refer to their location, time, budget)
- Helpful (give directions, suggestions, warnings)

If they share a photo:
- Translate any text you see
- Explain what it is
- Give actionable advice (e.g., "This is a menu. The tonkotsu ramen is ¥980.")`;
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
