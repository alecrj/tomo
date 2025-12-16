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
- ✅ Google Routes API (Walk, Transit, Drive) - ALL WORKING
- ✅ Google Maps SDK - FIXED
- ✅ Budget tracking with auto-detected currency (฿ in Thailand, etc.)
- ✅ Voice transcription (Whisper backend)
- ✅ Memory system (6 types of memories)
- ✅ Trip tracking (multi-city)
- ✅ Map explore screen with category browsing
- ✅ Onboarding flow
- ✅ Settings with dynamic currency
- ✅ Route duration displays correctly
- ✅ **Distance mismatch FIXED** - PlaceCard now shows real walking time from Routes API
- ✅ **Dark Mode** - Explorer Teal theme throughout app
- ✅ **ChatGPT-style messages** - User bubbles, AI full-width text
- ✅ **Compact header** - MiniMap moved to right, smaller (56x56)
- ✅ **Dark keyboard** - Matches app theme
- ✅ **Keyboard dismisses on send** - Like ChatGPT
- ✅ **Haptic feedback** - Safe wrappers (needs new build for native module)

### What's Broken / Needs Fixing
- ❌ **Tomo doesn't know the actual time** - Only passes "afternoon" not "3:47 PM"
- ❌ **Tomo thinks it's location-specific** - Says "explore Chiang Mai" not global
- ❌ **Dietary preferences ignored** - Settings saved but GPT doesn't follow them
- ❌ **Suggests closed places** - No verification that places are open
- ❌ **Temperature always Celsius** - No F/C preference in settings
- ❌ **Markdown shows raw** - `**bold**` displayed as text
- ❌ **No search in map modal** - Can only browse categories
- ❌ **No chat in map modal** - Can't ask Tomo questions in map view
- ❌ **expo-haptics not in build** - Errors until new dev client build

---

## Next Session: Priority Tasks

### 🔴 P0: CRITICAL FIXES (Do First)

#### 1. Fix System Prompt in `services/openai.ts`
The AI doesn't have proper context. Update `buildSystemPrompt()`:

```typescript
function buildSystemPrompt(context: DestinationContext): string {
  const now = new Date();
  const localTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return `You are Tomo, a friendly AI travel companion that works ANYWHERE in the world.

CURRENT CONTEXT:
- Location: ${context.neighborhood || 'Unknown location'}
- Local time: ${localTime} (${context.timeOfDay})
- Weather: ${context.weather?.condition || 'unknown'}, ${context.weather?.temperature || '?'}°
- Local currency: Use ${currency.symbol} for all prices
- User's budget remaining: ${currency.symbol}${context.budgetRemaining}

USER PREFERENCES (YOU MUST FOLLOW THESE):
${context.preferences.dietary?.length ? `- DIETARY: ${context.preferences.dietary.join(', ').toUpperCase()} - ONLY suggest places with these options available` : ''}
${context.preferences.budget ? `- BUDGET LEVEL: ${context.preferences.budget} - Match this price range` : ''}
${context.preferences.avoidCrowds ? '- AVOID CROWDS: Suggest quieter, less touristy places' : ''}
${context.preferences.interests?.length ? `- INTERESTS: ${context.preferences.interests.join(', ')} - Prioritize these` : ''}

CRITICAL RULES:
1. Only suggest places that are CURRENTLY OPEN at ${localTime}
2. Use local currency (${currency.symbol}) for ALL prices
3. Do NOT use markdown formatting (no **bold** or *italic*)
4. Be conversational and helpful like a knowledgeable local friend
5. You can answer ANY question - you're a general AI assistant with travel superpowers

RESPONSE FORMAT: Always respond with valid JSON...`;
}
```

#### 2. Add Temperature Unit Preference
In `stores/usePreferencesStore.ts`:
```typescript
interface PreferencesState {
  // ... existing
  temperatureUnit: 'C' | 'F';
  setTemperatureUnit: (unit: 'C' | 'F') => void;
}
```

Update Settings screen to show F/C toggle.

#### 3. Filter Closed Places
In `services/openai.ts` after getting placeCard:
```typescript
// After parsing response, verify place is open
if (result.placeCard && result.placeCard.coordinates) {
  // Get place details from Google to verify open status
  const isOpen = await verifyPlaceOpen(result.placeCard.name, context.location);
  if (!isOpen) {
    result.placeCard.openNow = false;
    // Optionally: re-prompt GPT for alternative
  }
}
```

---

### 🟡 P1: UI IMPROVEMENTS

#### 4. Cleaner Header Design
Current header is cluttered. Options:

**Option A: Ultra-minimal (Recommended)**
```
┌──────────────────────────────────────────┐
│ [≡]        Tomo              [🗺️] [⚙️] │
│       Chiang Mai • 23° • ฿1.5k           │
└──────────────────────────────────────────┘
```

**Option B: Keep current but polish**
- Remove MiniMap from header entirely
- Just icons: [Conversations] [Location text] [Map] [Settings]

#### 5. Enhanced Map Modal (`app/map.tsx`)
Add:
- Search bar at top (Google Places Autocomplete)
- Chat input at bottom ("Ask Tomo about this area...")
- Place markers on map
- Tappable markers show place details

```
┌──────────────────────────────────────────┐
│ [🔍 Search places...]              [✕]  │
├──────────────────────────────────────────┤
│                 🗺️ MAP                   │
│            [place markers]               │
│                          [📍 My loc]     │
├──────────────────────────────────────────┤
│ [🍜] [☕] [🛕] [🏪] [🎭]                 │
├──────────────────────────────────────────┤
│ [💬 Ask Tomo...]                    [➤] │
└──────────────────────────────────────────┘
```

---

### 🟢 P2: BIG FEATURES (Future)

#### 6. Voice Mode (OpenAI Realtime API)
- WebSocket connection to `wss://api.openai.com/v1/realtime`
- Streaming audio in/out
- Voice activity detection
- Background audio playback
- Voice turn-by-turn navigation

#### 7. Offline Mode
- Download map tiles for region
- Cache visited places and routes
- On-device voice transcription
- Queue requests for sync when online

---

## Files to Modify Next Session

| File | Changes |
|------|---------|
| `services/openai.ts` | Fix system prompt (time, global, dietary, no markdown) |
| `stores/usePreferencesStore.ts` | Add `temperatureUnit: 'C' \| 'F'` |
| `app/settings.tsx` | Add temperature unit toggle |
| `app/index.tsx` | Use temperature unit for weather display |
| `app/map.tsx` | Add search bar + chat input |
| `components/PlaceCard.tsx` | Show "Closed" warning if not open |

---

## Architecture

### API Services (in `/services/`)

| File | API | Purpose |
|------|-----|---------|
| `openai.ts` | OpenAI GPT-4o | Main chat - structured JSON responses |
| `places.ts` | Google Places API (New) | Search places, get details, photos |
| `routes.ts` | Google Routes API v2 | Walking, Transit, Driving directions |
| `voice.ts` | Whisper (Railway backend) | Voice transcription |
| `weather.ts` | OpenWeatherMap | Current weather |
| `location.ts` | Expo Location | GPS, reverse geocoding |

### State Management (Zustand stores in `/stores/`)

| Store | Purpose |
|-------|---------|
| `useConversationStore` | Chat messages, conversation threading |
| `useMemoryStore` | User preferences, likes, dislikes (6 types) |
| `useTripStore` | Multi-city trips, visits, expenses |
| `useBudgetStore` | Trip budget, daily budget, expenses |
| `useLocationStore` | GPS coordinates, neighborhood |
| `useNavigationStore` | Navigation state machine |
| `usePreferencesStore` | Home base, dietary, interests, **temperatureUnit** |
| `useWeatherStore` | Current weather |
| `useOnboardingStore` | Onboarding completion |

### Key Files

| File | Purpose |
|------|---------|
| `app/index.tsx` | Main chat screen |
| `app/map.tsx` | Map explore modal |
| `app/navigation.tsx` | Turn-by-turn navigation |
| `app/settings.tsx` | User preferences |
| `services/openai.ts` | GPT-4o integration (NEEDS FIXES) |
| `utils/haptics.ts` | Safe haptics wrapper |

---

## Environment Variables (`.env`)

```
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...
EXPO_PUBLIC_WEATHER_API_KEY=...
EXPO_PUBLIC_WHISPER_BACKEND_URL=https://tomo-production-ed80.up.railway.app
```

---

## Quick Commands

```bash
# Development
npx expo start --dev-client --tunnel

# Type check
npx tsc --noEmit

# Build dev client (needed for haptics)
eas build --profile development --platform ios

# Git
git add -A && git commit -m "message" && git push origin main
```

---

## Session History

### December 16, 2024 (Session 3) - Fixes & Planning
**Completed:**
- ✅ Fixed distance mismatch - PlaceCard now calls Routes API for real walking time
- ✅ Created `utils/haptics.ts` - Safe wrapper with `.catch()` for promise rejections
- ✅ Updated all files to use `safeHaptics` instead of raw `Haptics`
- ✅ ChatGPT-style messages - AI responses full-width, user bubbles
- ✅ Bigger fonts (17px), better line height (26px)
- ✅ Compact header with MiniMap on right (56x56)
- ✅ Dark keyboard + keyboard dismisses on send
- ✅ Smaller PlaceCard images (120px)

**Identified Issues:**
- Tomo doesn't know actual time (only "afternoon")
- Tomo thinks it's location-specific (not global)
- Dietary preferences ignored by GPT
- Suggests closed places
- No temperature unit preference (F/C)
- No search/chat in map modal

**Created comprehensive improvement plan**

### December 16, 2024 (Session 2) - UI Overhaul
- Dark mode with Explorer Teal theme
- MiniMap component
- TypingIndicator (3 bouncing dots)
- Tilted map view for navigation
- Chat overlay in navigation

### December 16, 2024 (Session 1) - Google Maps Fix
- Fixed black screen issue
- Rotated API key

---

## Git Status

**UNCOMMITTED CHANGES - Need to commit:**
- UI overhaul (dark mode, ChatGPT style)
- Distance mismatch fix
- Safe haptics wrapper
- All the fixes from today

```bash
# To commit all changes:
git add -A
git commit -m "feat: ChatGPT-style UI + distance fix + haptics safety

- ChatGPT-style messages (user bubbles, AI full-width)
- Fix distance mismatch (PlaceCard now uses real Routes API)
- Add safe haptics wrapper (utils/haptics.ts)
- Compact header with MiniMap on right
- Bigger fonts (17px) for readability
- Dark keyboard + dismiss on send
- Smaller PlaceCard images (120px)"

git push origin main
```

---

## Next Session Checklist

1. [ ] Commit current changes to git
2. [ ] Fix system prompt (time, global, dietary, no markdown)
3. [ ] Add temperature unit preference (F/C)
4. [ ] Filter closed places
5. [ ] Cleaner header design
6. [ ] Add search to map modal
7. [ ] Add chat to map modal
8. [ ] Build new dev client for haptics
