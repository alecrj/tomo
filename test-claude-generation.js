/**
 * Test script for Claude destination generation
 * Run with: node test-claude-generation.js
 */

require('dotenv').config();

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Mock context matching Tokyo location
const mockContext = {
  location: { latitude: 35.6762, longitude: 139.6503 },
  neighborhood: 'Shibuya',
  timeOfDay: 'evening',
  weather: {
    condition: 'clear',
    temperature: 18,
    humidity: 60,
    description: 'clear',
  },
  budgetRemaining: 6500,
  dailyBudget: 10000,
  preferences: {
    homeBase: { name: 'Shinjuku Station', address: 'Shinjuku, Tokyo', coordinates: { latitude: 35.6896, longitude: 139.7006 } },
    walkingTolerance: 'moderate',
    budget: 'moderate',
    dietary: ['vegetarian'],
    interests: ['food', 'culture'],
    avoidCrowds: false,
  },
  visitedPlaces: [],
  completedStamps: [],
  excludedToday: [],
  totalWalkingToday: 15,
};

function buildDestinationPrompt(context) {
  const timeEmoji = '🌆';
  const weatherEmoji = '☀️';

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

async function testClaudeGeneration() {
  console.log('🧪 Testing Claude destination generation...\n');

  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: EXPO_PUBLIC_CLAUDE_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('✓ API key found');
  console.log('✓ Context prepared:', {
    location: mockContext.neighborhood,
    time: mockContext.timeOfDay,
    weather: mockContext.weather.condition,
    budget: `¥${mockContext.budgetRemaining}`,
  });

  const prompt = buildDestinationPrompt(mockContext);

  console.log('\n📤 Sending request to Claude API...');

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
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
      console.error(`❌ Claude API error: ${response.status}`);
      console.error('Error details:', errorText);
      process.exit(1);
    }

    const message = await response.json();
    console.log('✓ Response received');

    const content = message.content[0];
    if (content.type !== 'text') {
      console.error('❌ Unexpected response type:', content.type);
      process.exit(1);
    }

    console.log('\n📥 Raw response:\n');
    console.log(content.text.substring(0, 200) + '...\n');

    // Parse the JSON (strip markdown code fences if present)
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const destination = JSON.parse(jsonText);

    console.log('✅ Successfully generated destination!\n');
    console.log('📍 Destination Details:');
    console.log('  Title:', destination.title);
    console.log('  Description:', destination.description);
    console.log('  Category:', destination.category);
    console.log('  Neighborhood:', destination.neighborhood);
    console.log('  Price Level:', '¥'.repeat(destination.priceLevel));
    console.log('  Estimated Cost:', `¥${destination.estimatedCost}`);
    console.log('  Why Now:', destination.whyNow);
    console.log('  Transit:', destination.transitPreview.description);
    console.log('  Spots:', destination.spots.length, 'suggestions');

    console.log('\n✨ Test completed successfully!');
    console.log('The Claude API integration is working correctly.\n');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

testClaudeGeneration();
