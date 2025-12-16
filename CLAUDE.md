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

## Current Status (December 16, 2024)

### What's Working
- ✅ AI chat with GPT-4o (context-aware, structured responses)
- ✅ Smart system prompt (time, location, dietary, no markdown)
- ✅ Google Places API (search, photos, open status verification)
- ✅ Google Routes API (walk, transit, drive with fallback calculations)
- ✅ Apple Maps on iOS / Google Maps on Android (no branding issues)
- ✅ Location tracking with city detection
- ✅ Budget tracking with auto-detected currency
- ✅ Voice transcription (Whisper backend)
- ✅ Memory system (remembers preferences)
- ✅ Trip tracking (multi-city)
- ✅ Dark mode (Explorer Teal theme)
- ✅ Notification store (built, not wired up)
- ✅ Itinerary store (built, no UI yet)

### What Needs Work
- ⚠️ UI not ChatGPT-level polished
- ⚠️ Settings scattered (should be in sidebar)
- ⚠️ No quick actions (+) button
- ⚠️ No itinerary UI screen
- ⚠️ Notifications not wired up
- ⚠️ No offline mode
- ⚠️ No voice mode (realtime)
- ⚠️ No booking integrations

---

## The Complete Roadmap

### Milestone 1: ChatGPT-Level Polish (Priority: CRITICAL)
*Goal: Make the app feel premium and intuitive*

#### 1.1 Quick Actions Button (+)
Add a + button that reveals contextual action chips:
```
Default chips:
🍜 Food   ☕ Coffee   🍺 Drinks   🏛️ Sights
📸 Photo  🗺️ Plan    💰 Budget   🏠 Home

Context-aware:
- Morning: "Breakfast" instead of "Food"
- Evening: "Dinner", "Nightlife" appear
- Navigating: "Pit stop", "Change route"
- Rainy: "Indoor activities"
```

#### 1.2 Sidebar Navigation (ChatGPT Style)
Move from tab bar to hamburger menu:
```
┌──────────────────┬──────────────────────────┐
│ ☰ Tomo           │                          │
├──────────────────┤                          │
│ + New chat       │                          │
│                  │    Current chat          │
│ TODAY            │    messages here         │
│ • Food recs      │                          │
│ • Temple guide   │                          │
│                  │                          │
│ YESTERDAY        │                          │
│ • Bangkok tips   │                          │
│                  │                          │
├──────────────────┤                          │
│ 📍 Chiang Mai    │                          │
│ 🗓️ My Itinerary  │                          │
│ 💰 Budget        │                          │
│ ⚙️ Settings      │                          │
└──────────────────┴──────────────────────────┘
```

#### 1.3 Response Polish
- Add emoji usage setting (lots/some/none)
- Add tone setting (casual/friendly/professional)
- Improve response formatting
- Faster perceived response time (streaming feel)

#### 1.4 Clean Up Header
Current header is cluttered. Simplify:
```
Before: [Chats] [Location • Temp • Budget] [Settings] [MiniMap]
After:  [☰]     [Chiang Mai, Thailand]              [🗺️]
```

---

### Milestone 2: Itinerary System (Priority: HIGH)
*Goal: Serve both planners and wanderers*

#### 2.1 Two Modes Philosophy
**Wanderer Mode (Default):**
- No itinerary needed
- Just chat and get instant recommendations
- "What should I do next?" works great

**Planner Mode (On Request):**
- User says "Plan my next 3 days"
- Tomo generates itinerary
- User can view/edit in dedicated screen
- Gets reminders for activities

#### 2.2 Itinerary UI Screen (`app/itinerary.tsx`)
```
┌─────────────────────────────────────┐
│ [←] My Chiang Mai Trip    [Share]  │
├─────────────────────────────────────┤
│ ○ Day 1  ● Day 2  ○ Day 3          │
├─────────────────────────────────────┤
│ 🌅 MORNING                          │
│ ┌─────────────────────────────────┐ │
│ │ 8:00 AM - Wat Chedi Luang       │ │
│ │ Ancient temple ruins            │ │
│ │ [Navigate]           [✓] [✕]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🌞 AFTERNOON                        │
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

#### 2.3 Chat Integration
- Detect "plan my day/week" requests automatically
- Show itinerary preview in chat
- "View full itinerary" button opens screen
- Modify via chat: "Actually skip the shopping"

---

### Milestone 3: Smart Notifications (Priority: HIGH)
*Goal: Helpful alerts, not annoying ones*

#### 3.1 Core Notification Types
| Type | Trigger | Value |
|------|---------|-------|
| **Transit** | Last train/bus approaching | Prevents being stranded |
| **Place Closing** | Destination closing soon | Saves wasted trips |
| **Weather** | Rain/storm incoming | Helps plan ahead |
| **Itinerary** | Next activity reminder | Keeps planners on track |
| **Budget** | Spending threshold | Financial awareness |

#### 3.2 Notification Preferences (Onboarding + Settings)
```
How much help do you want?

○ Minimal - Only urgent stuff (last train, safety)
● Balanced - Helpful reminders when useful
○ Full Support - Keep me informed of everything
```

#### 3.3 Wire Up Existing Stores
- Connect `useNotificationStore` to UI
- Connect `useLastTrainWarning` hook to app layout
- Add notification bell/indicator in header
- Push notifications via `expo-notifications`

---

### Milestone 4: Offline Mode (Priority: HIGH)
*Goal: App works when you lose signal*

#### 4.1 What Works Offline
| Feature | Offline | How |
|---------|---------|-----|
| Saved places | ✅ Full | AsyncStorage cache |
| Saved routes | ✅ Full | Cache polylines + steps |
| Map tiles | ✅ Full | Download region |
| Previous chats | ✅ Full | Already cached |
| New AI chat | ⚠️ Queue | Send when back online |
| Live transit | ❌ None | Requires internet |

#### 4.2 Implementation
- `stores/useOfflineStore.ts` - Manage cached data
- Download map tiles for current region
- Cache place details when viewed
- Queue messages when offline, sync when online
- Clear offline indicator in UI

#### 4.3 Offline UI
```
┌─────────────────────────────────────┐
│ ⚠️ You're offline                   │
│ Cached data available • 2 messages  │
│ queued                              │
└─────────────────────────────────────┘
```

---

### Milestone 5: Voice Mode (Priority: MEDIUM)
*Goal: Hands-free interaction while exploring*

#### 5.1 OpenAI Realtime API
- WebSocket connection for streaming audio
- Voice Activity Detection (VAD)
- Interrupt handling
- Works with AirPods/headphones

#### 5.2 Voice Mode UI
```
┌─────────────────────────────────────┐
│                                     │
│            🎙️                       │
│         Listening...                │
│                                     │
│    "Where's a good coffee shop      │
│     near here?"                     │
│                                     │
│         ━━━━━━━━━━━━━               │
│         [Tap to type]               │
│                                     │
└─────────────────────────────────────┘
```

#### 5.3 Voice Navigation
- Speak turn-by-turn directions
- "In 200 meters, turn left"
- Works in background

---

### Milestone 6: Booking Integration (Priority: MEDIUM)
*Goal: Close the loop - recommend AND book*

#### 6.1 Deep Links
| Service | Use Case |
|---------|----------|
| Hostelworld | Book hostels |
| Booking.com | Book hotels |
| Google Flights | Search flights |
| Grab/Uber | Book rides |
| Google Calendar | Export itinerary |

#### 6.2 "Tomo Finds, You Book" Flow
```
User: "Find me a hostel near Old City under $15"

Tomo: Found 3 hostels:

┌─────────────────────────────────────┐
│ Stamps Backpackers - $12/night ⭐9.2│
│ Clean dorms, great social vibe      │
│ [Hostelworld] [Booking.com] [Map]  │
└─────────────────────────────────────┘
```

---

### Milestone 7: Settings & Personalization (Priority: MEDIUM)
*Goal: Make Tomo feel personal*

#### 7.1 Tomo Personality Settings
```
Voice & Tone:
○ Casual    "Yo! Found this sick spot 🔥"
● Friendly  "Hey! Found a great place nearby"
○ Professional "I recommend this establishment"

Emoji Usage:
○ Lots 🎉  ● Some  ○ None

Response Length:
○ Brief  ● Balanced  ○ Detailed
```

#### 7.2 Travel Preferences
- Dietary restrictions (critical)
- Budget level
- Walking tolerance
- Crowd preference
- Interests (food, culture, nightlife, nature)

#### 7.3 Notification Preferences
- Per-type toggles
- Quiet hours
- Urgency threshold

---

## What We're NOT Building (Intentionally Cut)

| Feature | Reason |
|---------|--------|
| Stamps/Achievements | Adds complexity, gamification not core value |
| Expense Splitting | Splitwise exists, not our focus |
| Camera Translation | Google Translate exists |
| Multi-city Trip Planning | Scope creep, can add later |
| Social Features | Not core to solo/couple travel |
| Trip Recap/Journal | Nice-to-have, P3 at best |

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
| `realtime.ts` | 🔲 TODO | OpenAI Realtime (voice mode) |
| `offline.ts` | 🔲 TODO | Offline data management |

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
| `useNotificationStore` | ✅ Built | Notification queue |
| `useItineraryStore` | ✅ Built | Trip itineraries |
| `useOfflineStore` | 🔲 TODO | Offline cache |

### Hooks (`/hooks/`)
| Hook | Status | Purpose |
|------|--------|---------|
| `useLocation` | ✅ Built | Location tracking |
| `useWeather` | ✅ Built | Weather updates |
| `useTimeOfDay` | ✅ Built | Time-based context |
| `useCityDetection` | ✅ Built | City change detection |
| `useLastTrainWarning` | ✅ Built | Transit alerts |
| `useOfflineStatus` | 🔲 TODO | Network monitoring |

---

## Implementation Order (The Real TODO List)

### Phase 1: Polish (Next 1-2 Sessions)
- [ ] **Quick Actions Button** - Add + button with contextual chips
- [ ] **Sidebar Navigation** - Replace tab bar with hamburger menu
- [ ] **Clean Header** - Simplify to [☰] [Location] [🗺️]
- [ ] **Tone Settings** - Add personality customization
- [ ] **Emoji in Responses** - Enable by default, respect settings

### Phase 2: Itinerary (Next 2-3 Sessions)
- [ ] **Itinerary UI Screen** - `app/itinerary.tsx` with day view
- [ ] **Chat Integration** - Detect plan requests, show previews
- [ ] **Activity Management** - Add, remove, reorder, complete
- [ ] **Itinerary Reminders** - Connect to notification system

### Phase 3: Notifications (Next 1-2 Sessions)
- [ ] **Wire Up Notifications** - Connect stores to UI
- [ ] **Notification Center** - Bell icon, list view
- [ ] **Push Notifications** - expo-notifications setup
- [ ] **Preference Controls** - Onboarding + settings

### Phase 4: Offline (Next 2-3 Sessions)
- [ ] **Offline Store** - Cache management
- [ ] **Map Tile Download** - Region-based caching
- [ ] **Message Queue** - Send when back online
- [ ] **Offline Indicator** - Clear UI feedback

### Phase 5: Voice Mode (Future)
- [ ] **Realtime Service** - OpenAI WebSocket
- [ ] **Voice UI** - Listening/speaking states
- [ ] **Background Audio** - Continue in background

### Phase 6: Booking (Future)
- [ ] **Deep Links** - Hostelworld, Booking.com, etc.
- [ ] **Booking Flow** - "Book this" buttons in recommendations

---

## Session History

### December 16, 2024 (Session 5) - P0 Fixes + P1 Foundation
**Completed:**
- ✅ Fixed 0 min walk time bug (Haversine fallback)
- ✅ Removed Google branding (Apple Maps on iOS)
- ✅ Built `useNotificationStore.ts`
- ✅ Built `useItineraryStore.ts`
- ✅ Built `useLastTrainWarning.ts` hook
- ✅ Added `generateItinerary()` to OpenAI service
- ✅ Added itinerary-related types

### Previous Sessions
- Session 4: Smart system prompt, temperature units, place verification, map search
- Session 3: Distance fix, haptics, ChatGPT-style messages
- Session 2: Dark mode, MiniMap, TypingIndicator
- Session 1: Google Maps fix, API key rotation

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

## User Personas We're Designing For

### 1. Solo Backpacker
- Budget conscious
- Spontaneous (wanderer mode)
- Needs: Quick recs, budget tracking, safety info
- Key question: "What's cheap and good nearby?"

### 2. Couple Trip
- Moderate budget
- Mix of planning and spontaneity
- Needs: Day planning, romantic spots, reservations
- Key question: "Plan a nice day for us"

### 3. Business Traveler
- High budget, limited time
- Efficiency focused
- Needs: Fast decisions, reliable recs
- Key question: "Best coffee in 5 min walk"

### 4. Family Vacation
- Kid-friendly focus
- Dietary restrictions common
- Needs: Family activities, safe food
- Key question: "What can we do with kids?"

---

## Success Metrics (How We Know It's Working)

1. **Time to Value** - How fast can a new user get a useful recommendation? Target: <30 seconds
2. **Offline Reliability** - Does the app remain useful without signal? Target: Core features work
3. **Notification Quality** - Are notifications helpful or annoying? Target: >80% marked helpful
4. **Itinerary Adoption** - Do planners use the itinerary feature? Target: 40% of users
5. **Session Length** - Do people keep the app open while exploring? Target: >10 min average

---

## The North Star

**When a traveler lands in a new city, Tomo should be the first app they open.**

Not Google Maps. Not TripAdvisor. Not ChatGPT.

Tomo. Because it knows them, knows the city, and gives them exactly what they need in that moment.
