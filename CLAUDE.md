# Tomo - AI Travel Companion

## The Vision

**Tomo = ChatGPT + Travel Superpowers**

A general AI assistant that can answer anything, but with deep travel context:
- Knows your exact location, time, weather, budget
- Shows maps, navigates you anywhere
- Speaks to you in real-time (hands-free mode)
- Remembers everything about your trip
- Works offline in remote areas

**Tagline:** "Like having a local friend in every city"

---

## Current Status (December 16, 2024)

### What's Working
- ✅ Chat with GPT-4o (general Q&A + structured place recommendations)
- ✅ Location tracking and city detection
- ✅ Google Places API (search, photos)
- ✅ Google Routes API (Walk, Transit, Drive) - ALL WORKING with new API key
- ✅ Budget tracking with auto-detected currency (฿ in Thailand, etc.)
- ✅ Voice transcription (Whisper backend)
- ✅ Memory system (6 types of memories)
- ✅ Trip tracking (multi-city)
- ✅ Map explore screen with category browsing
- ✅ Onboarding flow
- ✅ Settings with dynamic currency
- ✅ Route duration displays correctly (fixed parsing)

### What's Broken
- ⚠️ expo-av deprecated - Needs migration to expo-audio

### Recent Fixes (Dec 16)

**Google Maps Black Screen - FIXED!**
Root cause: Wrong plugin parameter name in app.json. The react-native-maps plugin expects `iosGoogleMapsApiKey` but we had `googleMapsApiKey`.

What was fixed:
1. Created `app.config.js` for dynamic config (reads API key from env vars)
2. Uses correct parameter names: `iosGoogleMapsApiKey` and `androidGoogleMapsApiKey`
3. Removed hardcoded API key from app.json (was exposed on GitHub)
4. Rotated API key after Google detected public exposure
5. New key configured in eas.json for builds

**API Key Security:**
- Old key `AIzaSyAUI7qh-JvnANGhCc-8Tf2OJOGs2V5PNjc` was exposed - DELETED
- New key stored in `.env` (gitignored) and `eas.json` (for builds)
- Key should be restricted to bundle ID `com.alecrodriguez.tomo` in Google Cloud Console

---

## Development Roadmap

### Phase 0: Foundation (Current)
**Goal:** Get core experience working perfectly

| Task | Status | Notes |
|------|--------|-------|
| Fix Google Maps black screen | ✅ Done | Wrong plugin param name |
| Rebuild dev client with Google Maps | ✅ Done | Build submitted Dec 16 |
| Test all maps work | ⏳ Waiting | After build completes |
| Migrate expo-av → expo-audio | ⏳ Pending | Deprecated in SDK 54 |

### Phase 1: Voice Revolution
**Goal:** Hands-free conversations like ChatGPT voice mode

| Task | Status | Notes |
|------|--------|-------|
| Implement OpenAI Realtime API | ⏳ Pending | WebSocket-based streaming |
| Add voice output (AI speaks) | ⏳ Pending | TTS for responses |
| Voice turn-by-turn navigation | ⏳ Pending | "Turn left in 50 meters" |
| Push-to-talk or voice activity detection | ⏳ Pending | Hands-free activation |
| Background audio | ⏳ Pending | Keep guiding when phone locked |
| Visual feedback (waveforms) | ⏳ Pending | Show speaking state |

### Phase 2: Polish & UX
**Goal:** Feel as polished as ChatGPT/Claude

| Task | Status | Notes |
|------|--------|-------|
| Better conversation sidebar | ⏳ Pending | Like ChatGPT's sidebar |
| Smooth animations & transitions | ⏳ Pending | |
| Dark mode | ⏳ Pending | |
| Haptic feedback | ⏳ Pending | |
| Remove walking tolerance setting | ⏳ Pending | Not useful |
| Improved onboarding | ⏳ Pending | |

### Phase 3: Travel Intelligence
**Goal:** Know everything about travel

| Task | Status | Notes |
|------|--------|-------|
| Real-time camera translation | ⏳ Pending | Point at menu, get translation |
| Currency conversion display | ⏳ Pending | Show prices in home currency |
| Scam/safety alerts | ⏳ Pending | Warn about tourist traps |
| Last train warnings | ⚠️ Partial | Improve existing |
| Local tips knowledge | ⏳ Pending | "Shops close early Sundays" |
| Visa/entry requirements | ⏳ Pending | Based on passport country |

### Phase 4: Offline Mode
**Goal:** Work without internet

| Task | Status | Notes |
|------|--------|-------|
| Offline map tiles | ⏳ Pending | Download regions |
| Cache places & routes | ⏳ Pending | Save searched places |
| On-device voice transcription | ⏳ Pending | No internet needed |
| Request queue for sync | ⏳ Pending | Sync when back online |

### Phase 5: Social & Sharing
**Goal:** Share your adventures

| Task | Status | Notes |
|------|--------|-------|
| Trip recap PDF export | ⏳ Pending | |
| Instagram story generation | ⏳ Pending | Auto-create stories |
| Shareable trip links | ⏳ Pending | |
| Photo journal with auto-tagging | ⏳ Pending | Location-tagged photos |

### Phase 6: Proactive Assistant
**Goal:** Anticipate needs before you ask

| Task | Status | Notes |
|------|--------|-------|
| Weather alerts | ⏳ Pending | "Rain in 30 min, find indoor spot?" |
| Crowd avoidance | ⏳ Pending | "Busy now, go at 3pm instead" |
| Booking integration | ⏳ Pending | Reserve restaurants, buy tickets |
| Flight tracking | ⏳ Pending | "Your flight delayed 2 hours" |

---

## Architecture

### API Services (in `/services/`)

| File | API | Purpose |
|------|-----|---------|
| `openai.ts` | OpenAI GPT-4o | Main chat - structured JSON responses |
| `realtime.ts` | OpenAI Realtime API | 🔜 Voice conversations (to be added) |
| `places.ts` | Google Places API (New) | Search places, get details, photos |
| `routes.ts` | Google Routes API v2 | Walking, Transit, Driving directions |
| `voice.ts` | Whisper (Railway backend) | Voice transcription |
| `weather.ts` | OpenWeatherMap | Current weather |
| `location.ts` | Expo Location | GPS, reverse geocoding |
| `camera.ts` | Expo Camera | Photo capture |
| `claude.ts` | Claude API | Backup (not currently used) |

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
| `index.tsx` | Main chat screen |
| `map.tsx` | Map explore (browse nearby by category) |
| `navigation.tsx` | Google Maps-style turn-by-turn |
| `trip-recap.tsx` | Trip summary with map |
| `settings.tsx` | User preferences |
| `conversations.tsx` | Chat history sidebar |
| `onboarding.tsx` | First-launch setup |

---

## Environment Variables (`.env`)

```
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...      # GPT-4o for chat
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...       # Google Places + Routes + Maps
EXPO_PUBLIC_WEATHER_API_KEY=...             # OpenWeatherMap
EXPO_PUBLIC_WHISPER_BACKEND_URL=https://tomo-production-ed80.up.railway.app
EXPO_PUBLIC_CLAUDE_API_KEY=sk-ant-...       # Backup (optional)
```

### Google Cloud Console Setup
API Key must have these APIs enabled:
- ✅ Maps SDK for iOS
- ✅ Maps SDK for Android
- ✅ Places API (New)
- ✅ Routes API
- ✅ Geocoding API

---

## Code Patterns

### OpenAI Structured Response (response_format: json_object)
```typescript
// GPT-4o always returns JSON with this structure:
{
  "text": "I found a great spot for you!",
  "placeCard": null | {
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
```

### Navigation Flow
```
User asks for place → GPT-4o returns placeCard → User taps "Take me there"
→ viewDestination(destination) → router.push('/navigation')
→ Navigation screen fetches route from Google Routes API
→ Shows full screen map with route polyline
→ User walks there → Arrival detected (within 50m) → Visit logged
```

### Voice Flow (Current)
```
Tap mic → Record audio → Stop → Send to Whisper → Get transcription → Send to GPT-4o
```

### Voice Flow (Target - Realtime API)
```
Tap mic → WebSocket streams audio → GPT-4o processes live → Streams audio response back
(Sub-500ms latency, can interrupt mid-sentence)
```

---

## File Structure

```
/app
  _layout.tsx       # Root layout with onboarding redirect
  index.tsx         # Main chat (uses OpenAI)
  map.tsx           # Map explore (browse nearby by category)
  navigation.tsx    # Google Maps-style navigation
  trip-recap.tsx    # Trip summary
  settings.tsx      # User preferences
  conversations.tsx # Chat history
  onboarding.tsx    # First-launch flow

/services
  openai.ts         # GPT-4o chat (PRIMARY)
  realtime.ts       # 🔜 OpenAI Realtime API (to be added)
  routes.ts         # Google Routes API
  places.ts         # Google Places API
  voice.ts          # Whisper transcription
  location.ts       # GPS + geocoding
  weather.ts        # OpenWeatherMap
  camera.ts         # Photo capture
  claude.ts         # Claude chat (BACKUP)

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
2. **expo-av deprecated** - Warning shows, migrate to expo-audio before SDK 54
3. **Walking tolerance setting** - Not useful, should remove
4. **Google Maps blank** - Requires dev client rebuild

---

## Quick Reference Commands

```bash
# Development
npx expo start --dev-client --tunnel

# Type check
npx tsc --noEmit

# Build dev client (fixes Google Maps)
eas build --profile development --platform ios

# Build preview (standalone)
eas build --profile preview --platform ios

# Git
git add -A && git commit -m "message" && git push origin main
```

---

## Git Repository

**Remote:** https://github.com/alecrj/tomo.git
**Branch:** main

---

## Next Session Checklist

### Priority 1: Fix Google Maps Black Screen
The Routes API works but map tiles don't render. Debug steps:

1. **Verify Maps SDK for iOS is enabled** in Google Cloud Console:
   - Go to APIs & Services → Enabled APIs & Services
   - Look for "Maps SDK for iOS" in the list
   - If not there, enable it from Library

2. **Wait for billing propagation** (if just enabled):
   - Can take 5-15 minutes for Maps SDK to recognize billing
   - Kill app completely, wait, reopen

3. **If still broken, rebuild with cache clear**:
   ```bash
   eas build --profile development --platform ios --clear-cache
   ```

4. **Fallback option** - Use Apple Maps temporarily:
   - Remove `PROVIDER_GOOGLE` from all MapView components
   - Works without rebuild, but less ideal for international travel

### Priority 2: After Maps Work
1. Start **Phase 1: Voice Revolution** (OpenAI Realtime API)
2. Migrate expo-av to expo-audio (deprecated warning)

---

## Session History

### December 16, 2024
- Discovered API key was in wrong Google Cloud project ("recep" with closed billing)
- Created new API key in "tomo" project with billing enabled
- New key: `AIzaSyAUI7qh-JvnANGhCc-8Tf2OJOGs2V5PNjc`
- Routes API now working (Walk, Transit, Drive all succeed)
- Maps SDK still showing black screen (needs debugging)
- Added detailed error logging to routes.ts
- Created comprehensive 6-phase development roadmap
- Updated CLAUDE.md with full vision and plan

### December 15, 2024
- Fixed route duration parsing (was showing 0)
- Fixed currency in settings (now uses detectCurrency())
- Added map explore screen with category browsing
- Improved OpenAI structured JSON (response_format: json_object)

### December 14, 2024
- Switched from Claude API to OpenAI GPT-4o
- Redesigned navigation screen (Google Maps style)
- Fixed Zustand infinite loop with useMemo
- Fixed Transit routing
- Added better error logging
