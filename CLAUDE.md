# Tomo - AI Travel Companion

**Vision:** ChatGPT that always knows where you are, can show maps, navigate you anywhere, and remembers everything about your trip.

**Tagline:** "Like Strava for running, but Tomo for travel"

---

## Current Status (December 14, 2024)

### Just Completed This Session:
1. **Switched from Claude API to OpenAI GPT-4o** - Better for structured outputs and future real-time voice
2. **Redesigned navigation screen** - Now looks like Google Maps (full screen map, single step card, bottom ETA bar)
3. **Fixed Zustand infinite loop** - Messages now use useMemo for stable references
4. **Fixed Transit routing** - Removed invalid routingPreference parameter
5. **Added better error logging** - API errors now show actual error messages

### What's Working:
- Chat with GPT-4o (structured JSON responses for place cards)
- Location tracking and city detection
- Google Places API (search, photos)
- Google Routes API (Walk, Transit, Drive)
- Interactive maps with react-native-maps
- Budget tracking
- Memory system (6 types)
- Trip tracking (multi-city)
- Onboarding flow
- Settings screen

### What's NOT Working / Needs Testing:
- Navigation map may still show blank (needs testing after restart)
- Voice transcription (Whisper backend exists but untested)
- Trip recap sharing/export

---

## Development Setup

```bash
# Start development (after building dev client)
npx expo start --dev-client --tunnel

# If tunnel fails, ensure @expo/ngrok is installed:
npm install @expo/ngrok@4.1.0 --save-dev

# Type check
npx tsc --noEmit

# Build dev client (one-time)
eas build --profile development --platform ios
```

**Important:** The dev client connects via tunnel because local network often doesn't work.

---

## Architecture

### API Services (in `/services/`)

| File | API | Purpose |
|------|-----|---------|
| `openai.ts` | OpenAI GPT-4o | **Main chat** - structured responses with placeCards |
| `claude.ts` | Claude API | Backup (kept but not used) |
| `places.ts` | Google Places API (New) | Search places, get details, photos |
| `routes.ts` | Google Routes API v2 | Walking, Transit, Driving directions |
| `voice.ts` | Whisper (via Railway backend) | Voice transcription |
| `weather.ts` | OpenWeatherMap | Current weather |
| `location.ts` | Expo Location | GPS, reverse geocoding |
| `camera.ts` | Expo Camera | Photo capture |

### State Management (Zustand stores in `/stores/`)

| Store | Purpose |
|-------|---------|
| `useConversationStore` | Chat messages, conversation threading |
| `useMemoryStore` | User preferences, likes, dislikes (6 types) |
| `useTripStore` | Multi-city trips, visits, expenses |
| `useBudgetStore` | Trip budget, daily budget, expenses |
| `useLocationStore` | GPS coordinates, neighborhood |
| `useNavigationStore` | Navigation state machine |
| `usePreferencesStore` | Home base, dietary, interests |
| `useWeatherStore` | Current weather |
| `useOnboardingStore` | Onboarding completion |

### Key Screens (in `/app/`)

| Screen | Purpose |
|--------|---------|
| `index.tsx` | Main chat screen (default) |
| `navigation.tsx` | Google Maps-style navigation |
| `trip-recap.tsx` | Trip summary with map |
| `settings.tsx` | User preferences |
| `conversations.tsx` | Chat history |
| `onboarding.tsx` | First-launch setup |

---

## Environment Variables (`.env`)

```
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...  # GPT-4o for chat
EXPO_PUBLIC_CLAUDE_API_KEY=sk-ant-...   # Backup
EXPO_PUBLIC_WEATHER_API_KEY=...         # OpenWeatherMap
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...   # Google Places + Routes
EXPO_PUBLIC_WHISPER_BACKEND_URL=https://tomo-production-ed80.up.railway.app
```

---

## Remaining TODO List

### High Priority:
1. **Test navigation after restart** - Map might still be blank, need to debug
2. **Fix currency in settings** - Hardcoded as Yen (¥), should use `detectCurrency()`
3. **Add map explore button** - Button on main chat to open full map and browse nearby places
4. **Test voice transcription** - Whisper backend is deployed but untested in new flow

### Medium Priority:
5. Remove walking tolerance from settings (not useful)
6. Make conversations sidebar more visible (like ChatGPT)
7. Test OpenAI real-time voice API for hands-free navigation

### Future:
8. Trip recap export (PDF, shareable link)
9. Instagram story generation
10. Offline mode

---

## Code Patterns

### Chat Message with Place Card (OpenAI returns JSON)
```typescript
// GPT-4o returns structured JSON for place recommendations:
{
  "text": "I found a great spot for you!",
  "placeCard": {
    "name": "Restaurant Name",
    "address": "123 Street",
    "rating": 4.5,
    "priceLevel": 2,
    "distance": "8 min walk",
    "coordinates": {"latitude": 18.7, "longitude": 98.9}
  },
  "showMap": true,
  "actions": [
    {"label": "Take me there", "type": "navigate"},
    {"label": "Something else", "type": "regenerate"}
  ]
}
```

### Zustand Message Selection (avoid infinite loops)
```typescript
// CORRECT - use useMemo
const conversations = useConversationStore((state) => state.conversations);
const currentConversationId = useConversationStore((state) => state.currentConversationId);
const messages = useMemo(() => {
  const conv = conversations.find(c => c.id === currentConversationId);
  return conv?.messages || [];
}, [conversations, currentConversationId]);

// WRONG - creates new array each render
const messages = useConversationStore((state) => {
  const conv = state.conversations.find(c => c.id === state.currentConversationId);
  return conv?.messages || [];  // New array reference causes infinite loop!
});
```

### Navigation Flow
```
User asks for place → GPT-4o returns placeCard → User taps "Take me there"
→ viewDestination(destination) → router.push('/navigation')
→ Navigation screen fetches route from Google Routes API
→ Shows full screen map with route polyline
→ User walks there → Arrival detected (within 50m) → Visit logged
```

---

## File Structure

```
/app
  _layout.tsx       # Root layout with onboarding redirect
  index.tsx         # Main chat (uses OpenAI)
  navigation.tsx    # Google Maps-style navigation
  trip-recap.tsx    # Trip summary
  settings.tsx      # User preferences
  conversations.tsx # Chat history
  onboarding.tsx    # First-launch flow

/services
  openai.ts         # GPT-4o chat (PRIMARY)
  claude.ts         # Claude chat (BACKUP)
  routes.ts         # Google Routes API
  places.ts         # Google Places API
  voice.ts          # Whisper transcription
  location.ts       # GPS + geocoding
  weather.ts        # OpenWeatherMap
  camera.ts         # Photo capture

/stores
  useConversationStore.ts
  useMemoryStore.ts
  useTripStore.ts
  useBudgetStore.ts
  useLocationStore.ts
  useNavigationStore.ts
  usePreferencesStore.ts
  useWeatherStore.ts
  useOnboardingStore.ts

/components
  PlaceCard.tsx     # Inline place recommendation card
  InlineMap.tsx     # Small map in chat
  ActionButtons.tsx # Action buttons below messages

/hooks
  useLocation.ts    # Location tracking hook
  useCityDetection.ts
  useWeather.ts
  useTimeOfDay.ts

/constants
  config.ts         # Environment variables
  theme.ts          # Colors, spacing, typography

/utils
  currency.ts       # detectCurrency() based on GPS
  polyline.ts       # decodePolyline() for routes
```

---

## Known Issues

1. **Tunnel required for dev** - Local network doesn't work, must use `--tunnel`
2. **expo-av deprecated** - Warning shows, should migrate to expo-audio
3. **Currency hardcoded in settings** - Shows ¥ regardless of location
4. **Walking tolerance setting** - Not useful, should remove

---

## Git Repository

**Remote:** https://github.com/alecrj/tomo.git
**Branch:** main

Last commit includes:
- OpenAI service
- Redesigned navigation
- Fixed Zustand selectors
- Fixed transit routing
- Better error logging

---

## Quick Reference Commands

```bash
# Development
npx expo start --dev-client --tunnel

# Type check
npx tsc --noEmit

# Build dev client
eas build --profile development --platform ios

# Build preview (standalone)
eas build --profile preview --platform ios

# Git
git add -A && git commit -m "message" && git push origin main
```

---

## Next Session Priority

1. **Restart Metro and test** - `npx expo start --dev-client --tunnel`
2. **Test navigation** - Ask for a place, tap "Take me there", see if map works
3. **Check logs** - Look for `[Navigation]`, `[Routes]`, `[OpenAI]` logs
4. **Fix any remaining bugs** before adding new features
5. **If working:** Add map explore button on main screen
