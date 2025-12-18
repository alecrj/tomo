# Tomo - AI Travel Companion

## The Vision

**Tomo = Like having a local friend in every city**

A travel companion that:
- Answers ANY question (general AI + travel superpowers)
- Knows your location, time, weather, budget in real-time
- Works for planners AND spontaneous travelers
- Works offline when you lose signal
- Feels as clean and fast as ChatGPT

**Core Philosophy:** Minimum friction, maximum value. Every feature must earn its place.

---

## NEXT SESSION: Pick Up Here

### Session 8 Priority: UI Polish & Navigation Chat

**What needs immediate attention:**

#### 1. Map Screen Polish (`app/map.tsx`)
- Text doesn't fit in bubbles - fix overflow/truncation
- Place card sizing and padding issues
- Search results layout needs work
- Category pill spacing

#### 2. Navigation Chat Must Actually Work (`app/navigation.tsx`)
Current chat is **simulated with hardcoded responses**. Needs real AI:
- Connect to OpenAI API (not fake responses)
- Pass navigation context (location, destination, route, current step)
- Handle "add a stop" → re-route
- Handle "find X nearby" → show on map with option to add as stop
- Handle "how much longer" → answer from route data
- Add quick chips: "Pit stop", "Bathroom", "Coffee", "Change route"

#### 3. Action Buttons Need Full Implementation
- "Take me there" → reliable navigation start
- "Something else" → regenerate with exclusions
- "Add to itinerary" → add to current/new itinerary

---

## Current Status (December 18, 2024)

### What's Working
- ✅ AI chat with GPT-4o (context-aware, structured responses)
- ✅ Smart system prompt (time, location, dietary, no markdown)
- ✅ Google Places API (search, photos, open status verification)
- ✅ Google Routes API (walk, transit, drive with fallback)
- ✅ **Google Maps everywhere** (fixed this session)
- ✅ **Google Maps-style navigation** (compass rotation, street-level view, re-center button)
- ✅ Location tracking with city detection
- ✅ Budget tracking with auto-detected currency
- ✅ Voice transcription (Whisper backend)
- ✅ Memory system (remembers preferences)
- ✅ Trip tracking (multi-city)
- ✅ Dark mode (Explorer Teal theme)
- ✅ Quick Actions Menu (+) with contextual chips
- ✅ Sidebar Navigation (ChatGPT-style drawer)
- ✅ Simplified Header [☰] [Location] [🗺️]
- ✅ PlaceCard redesign with image carousel + info pills
- ✅ Notification store (built, not wired up)
- ✅ Itinerary store (built, placeholder UI)

### What Needs Work (PRIORITY ORDER)
1. **🚨 CRITICAL: Map screen UI polish** - Text overflow, bubble sizing
2. **🚨 CRITICAL: Navigation chat** - Currently simulated, needs real AI
3. **🚨 CRITICAL: Add stop functionality** - Re-routing during navigation
4. ⚠️ Itinerary UI needs full implementation
5. ⚠️ Notifications not wired up
6. ⚠️ No offline mode
7. ⚠️ No voice mode (realtime)
8. ⚠️ No booking integrations

---

## The Complete Development Plan

### PHASE 1: UI Polish & Critical Fixes (Current Priority)
*Goal: Make what exists actually work and look good*

#### 1.1 Map Screen Polish (`app/map.tsx`)
- [ ] Fix place card text overflow (truncation, line limits)
- [ ] Adjust bubble sizing and padding
- [ ] Polish search bar styling
- [ ] Fix category pill spacing
- [ ] Ensure markers are tappable and responsive

#### 1.2 Navigation Chat That Actually Works (`app/navigation.tsx`)
**Current:** Chat responses are hardcoded/simulated (lines 280-290)
**Needed:** Real AI chat that understands navigation context

- [ ] Connect chat to real OpenAI API (not simulated)
- [ ] Pass navigation context (current location, destination, route, step)
- [ ] Handle "add a stop" requests → re-route
- [ ] Handle "find X nearby" → show on map
- [ ] Handle "how far to destination" → answer from route data
- [ ] Quick action chips while navigating: "Pit stop", "Bathroom", "Coffee", "Change route"

#### 1.3 Response Actions That Work
- [ ] "Take me there" → starts navigation reliably
- [ ] "Something else" → regenerates with exclusions
- [ ] "Save for later" → adds to saved places
- [ ] "Add to itinerary" → adds to current/new itinerary

#### 1.4 Visual Polish Pass
- [ ] Consistent spacing throughout app
- [ ] Ensure all text fits in containers
- [ ] Loading states that feel fast
- [ ] Smooth animations on transitions
- [ ] Error states that are helpful

---

### PHASE 2: Itinerary System
*Goal: Planners can plan, wanderers can ignore*

#### 2.1 Itinerary Screen (`app/itinerary.tsx`)
```
┌─────────────────────────────────────┐
│ [←] My Chiang Mai Trip    [Share]  │
├─────────────────────────────────────┤
│ ○ Day 1  ● Day 2  ○ Day 3          │
├─────────────────────────────────────┤
│ MORNING                             │
│ ┌─────────────────────────────────┐ │
│ │ 8:00 AM - Wat Chedi Luang       │ │
│ │ Ancient temple ruins            │ │
│ │ [Navigate]           [✓] [✕]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ AFTERNOON                           │
│ ┌─────────────────────────────────┐ │
│ │ 12:30 PM - Khao Soi Khun Yai    │ │
│ │ Best khao soi in the city       │ │
│ │ [Navigate]           [✓] [✕]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ Add Activity]                    │
├─────────────────────────────────────┤
│ [Ask Tomo to modify...]        [➤] │
└─────────────────────────────────────┘
```

- [ ] Day selector tabs
- [ ] Time-of-day sections (Morning/Afternoon/Evening)
- [ ] Activity cards with Navigate, Complete, Remove buttons
- [ ] Drag to reorder activities
- [ ] "Add Activity" → opens search or chat
- [ ] Bottom input → chat with Tomo to modify

#### 2.2 Chat → Itinerary Integration
- [ ] Detect "plan my day/trip/week" in chat
- [ ] Call `generateItinerary()` from OpenAI service
- [ ] Show `ItineraryPreview` component in chat
- [ ] "View Full Itinerary" button → opens screen
- [ ] "Modify" button → continues chat

#### 2.3 Itinerary Reminders
- [ ] 30 min before activity → notification
- [ ] "Time to head to [place]" with Navigate button
- [ ] Connect to notification system

---

### PHASE 3: Notifications
*Goal: Helpful alerts, not annoying*

#### 3.1 Wire Up Existing Stores
- [ ] Connect `useNotificationStore` to UI
- [ ] Connect `useLastTrainWarning` hook to layout
- [ ] Notification indicator in header or sidebar

#### 3.2 Notification Types
| Type | Trigger | Message |
|------|---------|---------|
| Transit | Last train approaching | "Last train to [station] in 45 min" |
| Closing | Place closing soon | "[Place] closes in 30 min" |
| Weather | Rain incoming | "Rain expected in 1 hour" |
| Itinerary | Activity reminder | "Time for [activity]" |
| Budget | Threshold hit | "You've spent 80% of today's budget" |

#### 3.3 Notification UI
- [ ] Notification list screen
- [ ] Toast/banner for urgent notifications
- [ ] Push notifications via `expo-notifications`
- [ ] Settings: Minimal / Balanced / Full Support

---

### PHASE 4: Settings & Personalization
*Goal: Make Tomo feel personal*

#### 4.1 Tomo Personality
- [ ] Tone setting: Casual / Friendly / Professional
- [ ] Emoji usage: Lots / Some / None
- [ ] Response length: Brief / Balanced / Detailed
- [ ] Apply settings to system prompt

#### 4.2 Notification Preferences
- [ ] Per-type toggles
- [ ] Quiet hours
- [ ] Urgency threshold

#### 4.3 Translation Chip
- [ ] Add "Translate" to Quick Actions
- [ ] Sends prompt: "Help me translate..."
- [ ] Photo translation via existing camera flow

---

### PHASE 5: Offline Mode
*Goal: App works without signal*

#### 5.1 Offline Store (`useOfflineStore`)
- [ ] Track online/offline status
- [ ] Cache place details when viewed
- [ ] Cache routes when navigated
- [ ] Queue messages when offline

#### 5.2 Offline UI
- [ ] Banner: "You're offline • X messages queued"
- [ ] Greyed out features that require internet
- [ ] Auto-sync when back online

#### 5.3 Map Tile Caching
- [ ] Download tiles for current region
- [ ] "Download area for offline" button
- [ ] Storage management

---

### PHASE 6: Voice Mode (Future)
*Goal: Hands-free while exploring*

#### 6.1 OpenAI Realtime API
- [ ] WebSocket connection
- [ ] Voice Activity Detection
- [ ] Streaming responses
- [ ] Interrupt handling

#### 6.2 Voice UI
- [ ] Full-screen listening mode
- [ ] Waveform visualization
- [ ] "Tap to type" fallback

#### 6.3 Voice Navigation
- [ ] Speak turn-by-turn directions
- [ ] Background audio
- [ ] AirPods support

---

### PHASE 7: Booking Integration (Future)
*Goal: Recommend AND book*

#### 7.1 Deep Links
- [ ] Hostelworld
- [ ] Booking.com
- [ ] Google Flights
- [ ] Grab/Uber
- [ ] Google Calendar (export itinerary)

---

## Implementation Priority

| Phase | Priority | Sessions | Status |
|-------|----------|----------|--------|
| **1. UI Polish** | CRITICAL | 1-2 | Not started |
| **2. Itinerary** | High | 2-3 | Store built, UI placeholder |
| **3. Notifications** | High | 1-2 | Store built, not wired |
| **4. Settings** | Medium | 1 | Partial |
| **5. Offline** | Medium | 2-3 | Not started |
| **6. Voice Mode** | Future | 3-4 | Not started |
| **7. Booking** | Future | 1-2 | Not started |

---

## Technical Architecture

### Services (`/services/`)
| File | Status | Purpose |
|------|--------|---------|
| `openai.ts` | ✅ Built | Chat + itinerary generation |
| `places.ts` | ✅ Built | Google Places API |
| `routes.ts` | ✅ Built | Google Routes API |
| `voice.ts` | ✅ Built | Whisper transcription |
| `weather.ts` | ✅ Built | OpenWeatherMap |
| `location.ts` | ✅ Built | GPS + geocoding |
| `realtime.ts` | TODO | OpenAI Realtime (voice mode) |
| `offline.ts` | TODO | Offline data management |

### Stores (`/stores/`)
| Store | Status | Purpose |
|-------|--------|---------|
| `useConversationStore` | ✅ Built | Chat messages |
| `useMemoryStore` | ✅ Built | User preferences memory |
| `useTripStore` | ✅ Built | Trip tracking |
| `useBudgetStore` | ✅ Built | Budget tracking |
| `useLocationStore` | ✅ Built | GPS coordinates |
| `useNavigationStore` | ✅ Built | Navigation state |
| `usePreferencesStore` | ✅ Built | User settings |
| `useWeatherStore` | ✅ Built | Weather data |
| `useNotificationStore` | ✅ Built | Notification queue (not wired) |
| `useItineraryStore` | ✅ Built | Trip itineraries (not wired) |
| `useOfflineStore` | TODO | Offline cache |

### Key Files to Know
| File | What it does |
|------|--------------|
| `app/index.tsx` | Main chat screen |
| `app/map.tsx` | Map explorer (needs polish) |
| `app/navigation.tsx` | Turn-by-turn navigation (chat needs real AI) |
| `app/itinerary.tsx` | Itinerary screen (placeholder) |
| `components/PlaceCard.tsx` | Place recommendation cards |
| `components/QuickActionsMenu.tsx` | (+) button contextual chips |
| `components/Sidebar.tsx` | ChatGPT-style nav drawer |

---

## Session History

### December 18, 2024 (Session 8) - Google Maps & Navigation Overhaul
**Completed:**
- ✅ Switched to Google Maps everywhere (map.tsx, navigation.tsx, MiniMap.tsx)
- ✅ Replaced MiniMap with simple map icon button in header
- ✅ Installed `expo-sensors` for Magnetometer
- ✅ Implemented Google Maps-style navigation:
  - Compass-based heading rotation (map rotates with device)
  - 60° pitch for street-level feel
  - Zoom 18 for detail
  - Camera offset to put user at bottom 1/3 of screen
  - Re-center button when user pans away
  - Progressive step advancement based on distance

**Files Changed:**
- `app/map.tsx` - PROVIDER_GOOGLE
- `app/navigation.tsx` - Full navigation overhaul with Magnetometer
- `app/index.tsx` - Replaced MiniMap with icon button
- `components/MiniMap.tsx` - PROVIDER_GOOGLE

**Dev Client Rebuild:** Required for `expo-sensors` (Magnetometer)

### December 17, 2024 (Session 7) - Maps & Architecture Decisions
- Decided to switch Apple Maps → Google Maps
- Decided to remove MiniMap from header
- Decided navigation needs Google Maps style
- Decided translation = conversational only

### December 16, 2024 (Session 6) - ChatGPT-Level Polish
- Quick Actions Menu (+)
- Sidebar Navigation
- Simplified Header
- PlaceCard redesign with carousel
- ItineraryPreview component

### Previous Sessions
- Session 5: Notification store, Itinerary store, useLastTrainWarning hook
- Session 4: Smart system prompt, temperature units, place verification
- Session 3: Distance fix, haptics, ChatGPT-style messages
- Session 2: Dark mode, MiniMap, TypingIndicator
- Session 1: Initial Google Maps fix, API key rotation

---

## Quick Commands

```bash
# Development
npx expo start --dev-client --tunnel

# Type check
npx tsc --noEmit

# Build dev client (needed after adding native modules)
eas build --profile development --platform ios

# Git
git add -A && git commit -m "message" && git push origin main
```

---

## What Tomo Replaces

| Currently Use | Tomo Replaces With |
|---------------|-------------------|
| Google Maps "find food" | "What's good to eat nearby?" |
| TripAdvisor reviews | Tomo knows ratings + gives context |
| Trip planning apps | "Plan my 3 days" → itinerary |
| Currency converter | Built into all prices automatically |
| "Is this open?" searches | Real-time status in responses |
| Translation apps | "How do I say X?" / photo translation |

---

## The North Star

**When a traveler lands in a new city, Tomo should be the first app they open.**

Not Google Maps. Not TripAdvisor. Not ChatGPT.

Tomo. Because it knows them, knows the city, and gives them exactly what they need in that moment.
