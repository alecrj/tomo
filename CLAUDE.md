# Tomo - AI Travel Companion

## Current Status (Session 22)

**Last Updated:** December 22, 2024

**Map Solution:** Apple Maps tiles + Google APIs for places/routes data. Google Maps tiles had persistent rendering issues.

### App Structure

**4 Main Tabs:**
| Tab | Screen | Purpose |
|-----|--------|---------|
| Chat | `app/(tabs)/index.tsx` | Conversational AI with place recommendations |
| Map | `app/(tabs)/map.tsx` | Browse/explore with Apple Maps |
| Saved | `app/(tabs)/saved.tsx` | Your saved places collection |
| You | `app/(tabs)/you.tsx` | Settings, stats, preferences |

**Feature Screens:**
| Screen | Purpose |
|--------|---------|
| `app/navigation.tsx` | Turn-by-turn with compass |
| `app/voice.tsx` | Hands-free gpt-realtime |
| `app/settings.tsx` | Preferences & account |
| `app/expenses.tsx` | Budget tracking |
| `app/trip-recap.tsx` | AI-generated summary |
| `app/onboarding.tsx` | First-time setup |

### What's Working
- Conversational AI with GPT-4o
- Place recommendations with PlaceCards
- Apple Maps with dark mode
- Turn-by-turn navigation with compass
- Voice mode with gpt-realtime
- Camera translation
- Memory system (learns preferences)
- Saved places
- Budget tracking
- Trip recap with AI summary
- Offline mode (graceful fallback)

### Quick Commands
```bash
# Development
npx expo start --dev-client

# Build for device
npx expo run:ios --device

# Type check
npx tsc --noEmit
```

---

## The Vision

**Tomo = The ONLY app a traveler needs**

When someone lands in a new city, they open Tomo - not Google Maps, not TripAdvisor, not ChatGPT. Tomo gives them ONE confident recommendation, they tap "Take me there", and they're walking.

**Home Screen = Chat:**
- Starts quiet: greeting + "Ask me anything" + category chips
- Chips are shortcuts - tapping sends that message
- Response shows PlaceCard options
- No proactive recommendations - user initiates

---

## OpenAI Models

**Use these EXACT model names:**

| Purpose | Model ID | Notes |
|---------|----------|-------|
| Main Chat AI | `gpt-4o` | Chat, vision, trip summaries |
| Voice/Realtime | `gpt-realtime` | WebRTC voice conversations |

**Files using models:**
- `services/openai.ts` - gpt-4o
- `services/realtime.ts` - gpt-realtime
- `hooks/useMemoryExtraction.ts` - gpt-4o

---

## Voice Mode (Realtime API)

Uses WebRTC for low-latency voice-to-voice. Required package: `react-native-webrtc`

**Key points:**
- WebSocket: `wss://api.openai.com/v1/realtime`
- Server-side VAD for natural turn-taking
- Audio: PCM16 at 24kHz

---

## API Requirements

| Variable | Required For |
|----------|--------------|
| `EXPO_PUBLIC_OPENAI_API_KEY` | All AI features |
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | Places, photos, routes |
| `EXPO_PUBLIC_WEATHER_API_KEY` | Weather (optional) |

---

## Technical Architecture

### Services (`/services/`)
| File | Purpose |
|------|---------|
| `openai.ts` | GPT-4o chat + memory integration |
| `places.ts` | Google Places API |
| `routes.ts` | Google Routes API |
| `weather.ts` | Weather with mock fallback |
| `location.ts` | GPS + geocoding |
| `realtime.ts` | gpt-realtime WebSocket |
| `booking.ts` | Deep link generators |

### Stores (`/stores/`)
| Store | Purpose |
|-------|---------|
| `useConversationStore` | Chat messages |
| `useMemoryStore` | Learned preferences |
| `useTripStore` | Trip data |
| `useBudgetStore` | Expenses |
| `useLocationStore` | GPS coordinates |
| `useNavigationStore` | Navigation state |
| `usePreferencesStore` | User settings |
| `useWeatherStore` | Weather cache |
| `useItineraryStore` | Day plans |
| `useOfflineStore` | Network status |
| `useSavedPlacesStore` | Saved places |

### Key Hooks
| Hook | Purpose |
|------|---------|
| `useNotificationTriggers` | Background checks (30s) |
| `useMemoryExtraction` | Auto-learn from chat |
| `useLocation` | GPS with permissions |
| `useTimeOfDay` | Time-based UI |

---

## Map Configuration

Using **Apple Maps** for tiles with **Google APIs** for data:

```typescript
// All MapView components use:
provider={PROVIDER_DEFAULT}
userInterfaceStyle="dark"
```

**Files with MapView:**
- `app/(tabs)/map.tsx` - Main map explorer
- `app/navigation.tsx` - Turn-by-turn
- `components/ItineraryMap.tsx` - Itinerary map
- `components/MiniMap.tsx` - Small map preview

**Map Categories (Google Places types):**
| Category | Google Places Type |
|----------|-------------------|
| Food | `restaurant` |
| Coffee | `cafe` |
| Drinks | `bar` |
| Sights | `tourist_attraction` |
| Shopping | `shopping_mall` |
| Nature | `park` |

---

## Features Implemented

### Session 21 (Current)
- Switched to Apple Maps tiles (Google had rendering issues)
- Added dark mode via `userInterfaceStyle="dark"`
- Added Open Now filter
- Added re-center button
- Added results count badge
- Markers show ratings
- Closed places dimmed

### Session 19-20
- Navigation polish with blue route (#4285F4)
- Plan screen with activity list
- Brevity in AI responses
- Filter closed places from recommendations

### Session 14-18
- Smart Day Map with route visualization
- Route optimization
- Expense tracking
- Weather forecasts
- Trip recaps with AI summary
- Currency converter
- Language preference (10 languages)
- Home as conversation

---

## Testing on Device

```bash
# Build and install
npx expo run:ios --device

# Or via Xcode
cd ios && xcodebuild -workspace tomo.xcworkspace -scheme tomo -destination 'id=DEVICE_ID'
```

**What requires physical device:**
- Maps rendering
- Location/GPS
- Compass/magnetometer
- Voice/microphone
- Offline mode (airplane mode)

---

## Known Issues to Fix

1. **Chat bar positioning** - Adjust TAB_BAR_HEIGHT constant
2. **Category mappings** - Nature showing wrong places
3. **Search results** - Not showing all nearby spots
4. **Map styling** - Make less obviously Apple Maps

---

## Git Workflow

```bash
git add -A && git commit -m "message" && git push origin main
```
