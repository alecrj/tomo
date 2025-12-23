# Tomo - AI Travel Companion

## Current Status (Session 24)

**Last Updated:** December 23, 2024

**Map Solution:** Apple Maps tiles + Google APIs for places/routes data.

### Session 24 Progress - Navigation Enhancements Complete

**Major Features Added:**
- ✅ **Marker panning fix** - Marker no longer moves/rotates when panning map
  - Explicit `flat={false}` and `rotation={0}` on Marker
  - Direction cone only shows in following mode
  - Uses expo-location's `watchHeadingAsync` (same as Apple/Google Maps)

- ✅ **Speed indicator** - Shows current speed in km/h in bottom bar
  - Only displays when moving > 0.5 m/s
  - Uses `Location.watchPositionAsync()` for real-time tracking

- ✅ **Share ETA** - Button to share arrival time with others
  - Uses React Native Share API
  - Includes destination name, ETA time, and distance

- ✅ **Alternate routes (driving)** - Up to 3 route options
  - Gray polylines for unselected routes (tappable to select)
  - Route picker modal showing Best/Fastest/Shortest labels
  - Routes labeled with duration and distance

- ✅ **Route preferences** - Avoid highways/tolls/ferries
  - Settings modal with toggle options
  - Preferences button shows active state when options set
  - Routes recalculate when preferences change

- ✅ **Save route** - Bookmark routes for later
  - New `useSavedRoutesStore` for persistent storage
  - Tracks use count and last used time
  - Visual feedback when saved (green bookmark)

### Offline Maps Research

For true offline maps, **MapLibre React Native** is the recommended solution:

**Official OfflineManager API:**
- `createPack()` - Download tiles for specific region/zoom levels
- `invalidatePack()` - Update tiles without full re-download
- Packs automatically used by MapViews with same style

**Implementation Requirements:**
```bash
npm install @maplibre/maplibre-react-native
```

**Key Considerations:**
- Requires custom dev client (not Expo Go compatible)
- Need tile source (MapTiler, Stadia Maps, or self-hosted)
- V11 alpha has better New Architecture support
- Some tile providers have GZIP issues on mobile

**Recommended Approach for Tomo:**
1. Continue using Apple Maps tiles (current setup)
2. Cache viewed areas automatically
3. Show "Offline" banner when no connection
4. Queue messages for when connection returns (already implemented)

**Sources:**
- [MapLibre OfflineManager](https://maplibre.org/maplibre-react-native/docs/modules/offline-manager/)
- [MapLibre React Native GitHub](https://github.com/maplibre/maplibre-react-native)

---

### Previous Session Work

**Session 23 - Expandable Step List:**
- Tap turn header to see all navigation steps
- Past steps shown with checkmark
- Transit steps show line names
- Distance and time for each step

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
| `app/navigation.tsx` | Apple Maps-style turn-by-turn with direction cone |
| `app/voice.tsx` | Hands-free gpt-realtime |
| `app/settings.tsx` | Preferences & account |
| `app/expenses.tsx` | Budget tracking |
| `app/trip-recap.tsx` | AI-generated summary |
| `app/onboarding.tsx` | First-time setup |

### What's Working
- Conversational AI with GPT-4o
- Place recommendations with PlaceCards
- Apple Maps with dark mode
- **Apple Maps-style navigation UI** (turn header, end route, stats bar)
- **Travel mode selector** (Walk/Transit/Drive with route recalculation)
- **Direction cone on user marker** (shows which way you're facing)
- **Expandable step list** (tap turn header to see all steps)
- **Smart navigation chat** (find places, add stops mid-route)
- **Waypoint support** (multi-stop routes)
- **Transit UI** (train/bus icons, line names, stop details)
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

## Smart Navigation System

The navigation screen (`app/navigation.tsx`) provides Apple Maps-style navigation with smart chat.

### UI Components
```
┌──────────────────────────────────────────┐
│  [Turn Icon]  100 m                      │ ← Turn Header
│               Main Street                │
├──────────────────────────────────────────┤
│                                          │
│              [MAP VIEW]           [📍]   │ ← Control buttons
│              Blue route line      [🔊]   │
│              Red destination      [💬]   │
│                                          │
├──────────────────────────────────────────┤
│ [End]  | 2:45 PM | 12 min | 850 m       │ ← Bottom Bar
└──────────────────────────────────────────┘
```

### Smart Chat Features
- **Find places:** "Where's the nearest bathroom?"
- **Add stops:** Searches Google Places, calculates detour time
- **Action buttons:** "Add stop (+3 min)" / "Go there instead"
- **Route info:** "How much longer until I arrive?"

### Key Functions
| Function | File | Purpose |
|----------|------|---------|
| `smartNavigationChat()` | `services/openai.ts` | AI chat with place search |
| `detectPlaceIntent()` | `services/openai.ts` | Maps requests to Places types |
| `addWaypoint()` | `stores/useNavigationStore.ts` | Add stop to route |

### Place Intent Detection
| User Says | Detected Type |
|-----------|---------------|
| "bathroom" / "toilet" | `toilet` |
| "coffee" / "cafe" | `cafe` |
| "7-11" / "convenience" | `convenience_store` |
| "ATM" / "cash" | `atm` |
| "food" / "hungry" | `restaurant` |

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

### Session 23 (Current)
- **Apple Maps-style navigation UI:**
  - Turn instruction header (big distance + maneuver icon + street name)
  - Bottom stats bar (arrival time, duration, distance)
  - End Route button (red, prominent)
  - Overview button (see full route)
  - Re-center button
  - Volume/mute button
- **Smart navigation chat:**
  - Find places mid-route ("where's the nearest bathroom?")
  - Get detour time calculations
  - Action buttons to add stops
  - Waypoint support for multi-stop routes
- Files modified:
  - `app/navigation.tsx` - Complete rewrite
  - `stores/useNavigationStore.ts` - Added waypoint support
  - `services/openai.ts` - Added `smartNavigationChat()` function

### Session 22
- Trimmed CLAUDE.md from 54k to 6k chars
- Fixed chat bar positioning in map view
- Added Apple Maps polish (mutedStandard, no POIs)
- Fixed category mappings (shopping_mall → store, Nature → Parks)
- Increased search results and radius

### Session 21
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

1. ~~Chat bar positioning~~ - FIXED
2. ~~Category mappings~~ - FIXED
3. ~~Search results~~ - FIXED (increased to 20 results, 3km radius)
4. ~~Map styling~~ - FIXED (mutedStandard, no POIs)

**Remaining:**
- Test smart navigation chat on device
- Test waypoint addition/removal
- Verify all navigation features work end-to-end

---

## Git Workflow

```bash
git add -A && git commit -m "message" && git push origin main
```
