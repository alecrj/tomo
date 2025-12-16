# Tomo - AI Travel Companion

## The Vision

**Tomo = The Ultimate Travel Companion**

Not just a travel app - a complete AI-powered travel operating system:
- General AI assistant that can answer ANYTHING
- Deep travel context (location, time, weather, budget)
- Plans your entire trip (flights, accommodation, daily itineraries)
- Real-time navigation with live transit updates
- Smart notifications (last train, place closing, weather alerts)
- Works offline in remote areas
- Integrates with booking apps (Hostelworld, Booking.com, etc.)
- Voice mode for hands-free exploration

**Tagline:** "Like having a local friend in every city"

---

## Current Status (December 16, 2024)

### What's Working
- ✅ Chat with GPT-4o (general Q&A + structured place recommendations)
- ✅ **Smart system prompt** - Actual time, global AI, dietary emphasis, no markdown
- ✅ **Temperature unit preference** - C/F toggle in settings
- ✅ **Place open verification** - Checks Google Places API before showing
- ✅ **Map search bar** - Search places directly in map modal
- ✅ **Map chat input** - Ask Tomo about the area from map view
- ✅ Location tracking and city detection
- ✅ Google Places API (search, photos, open status)
- ✅ Google Routes API (Walk, Transit, Drive)
- ✅ Google Maps SDK with dark theme
- ✅ Budget tracking with auto-detected currency
- ✅ Voice transcription (Whisper backend)
- ✅ Memory system (6 types of memories)
- ✅ Trip tracking (multi-city)
- ✅ Map explore screen with category browsing
- ✅ Onboarding flow
- ✅ Settings with dynamic currency
- ✅ Dark mode (Explorer Teal theme)
- ✅ ChatGPT-style messages
- ✅ Haptic feedback (safe wrappers)

### Known Bugs
- ❌ **0 min walk time** - Routes API sometimes returns 0 duration (see logs)
- ❌ **Google branding** - MiniMap opens Google Maps, shows Google logo
- ❌ **expo-haptics not in build** - Needs new dev client build

---

## Feature Roadmap

### Phase 1: Core Fixes (Next Session)

#### 1.1 Fix 0 Min Walk Time Bug
The Routes API sometimes returns `duration: 0`. Need to investigate.
```
LOG  [Routes] Walking directions fetched: {"distance": undefined, "duration": 0, ...}
```

#### 1.2 Remove Google Branding
- Replace MiniMap tap action with in-app navigation
- Remove "Google" text from navigation buttons
- Use our own map styling throughout

#### 1.3 Build New Dev Client
```bash
eas build --profile development --platform ios
```
Needed for expo-haptics to work properly.

---

### Phase 2: Smart Notifications

#### 2.1 Notification System Architecture
New store: `stores/useNotificationStore.ts`

```typescript
interface Notification {
  id: string;
  type: 'last_train' | 'place_closing' | 'weather' | 'itinerary' | 'budget' | 'transit';
  priority: 'urgent' | 'warning' | 'info';
  title: string;
  body: string;
  scheduledFor?: Date;
  action?: { type: string; payload: any };
}
```

#### 2.2 Notification Types

| Type | Trigger | Example |
|------|---------|---------|
| **Last Train** | Time + location + home base | "Last train to Chang Phueak leaves in 45 min" |
| **Place Closing** | Current destination + hours | "Wat Phra Singh closes in 30 min" |
| **Weather Alert** | Weather API change | "Rain expected at 3 PM" |
| **Itinerary** | Scheduled activity | "Thai cooking class in 1 hour" |
| **Budget** | Spending threshold | "80% of today's budget spent" |
| **Transit** | Real-time transit data | "Your bus arrives in 5 min" |

#### 2.3 Implementation
- Use `expo-notifications` for push notifications
- Background location tracking for geofencing
- Periodic weather checks
- Integration with itinerary system

---

### Phase 3: Itinerary Planning

#### 3.1 Itinerary Data Model
New store: `stores/useItineraryStore.ts`

```typescript
interface Itinerary {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  days: ItineraryDay[];
}

interface ItineraryDay {
  date: Date;
  activities: Activity[];
}

interface Activity {
  id: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  startTime?: string;
  endTime?: string;
  place?: PlaceCardData;
  title: string;
  description: string;
  category: 'food' | 'culture' | 'activity' | 'transport' | 'rest';
  booked: boolean;
  bookingUrl?: string;
}
```

#### 3.2 AI Itinerary Generation
User says: "Plan my next 3 days in Chiang Mai"

GPT generates structured itinerary with:
- Time-appropriate activities (temples morning, nightlife evening)
- Geographical clustering (minimize travel between activities)
- Budget-aware suggestions
- Dietary-compliant food recommendations
- Weather-aware outdoor activities

#### 3.3 Itinerary UI
New screen: `app/itinerary.tsx`

```
┌─────────────────────────────────────┐
│ [←] My Chiang Mai Trip    [Share]  │
├─────────────────────────────────────┤
│ ○ Day 1  ● Day 2  ○ Day 3          │
├─────────────────────────────────────┤
│ 🌅 MORNING                          │
│ ┌─────────────────────────────────┐ │
│ │ 8:00 AM                         │ │
│ │ Wat Chedi Luang                 │ │
│ │ Ancient temple ruins            │ │
│ │ [Navigate] [Remove]             │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 10:00 AM                        │ │
│ │ Ristr8to Coffee                 │ │
│ │ Award-winning latte art         │ │
│ │ [Navigate] [Remove]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🌞 AFTERNOON                        │
│ ┌─────────────────────────────────┐ │
│ │ 12:30 PM                        │ │
│ │ Khao Soi Khun Yai               │ │
│ │ Best khao soi in the city       │ │
│ │ [Navigate] [Remove]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ Add Activity]                    │
├─────────────────────────────────────┤
│ [💬 Ask Tomo to modify...]     [➤] │
└─────────────────────────────────────┘
```

---

### Phase 4: Third-Party Integrations

#### 4.1 Deep Link Integration

| Service | Deep Link Format | Use Case |
|---------|-----------------|----------|
| **Hostelworld** | `hostelworld://search?city=X&checkin=Y` | Book hostels |
| **Booking.com** | `booking://hotel?dest_id=X` | Book hotels |
| **Google Flights** | `https://google.com/flights?q=X+to+Y` | Search flights |
| **Skyscanner** | Skyscanner API | Compare flights |
| **Grab** | `grab://open?screenType=BOOKING&lat=X&lng=Y` | Book rides |
| **Google Calendar** | Calendar API | Export itinerary |

#### 4.2 "Tomo Finds, You Book" Flow
```
User: "Find me a hostel near Old City under $15"

Tomo: "I found 3 hostels near Old City:

1. Stamps Backpackers - $12/night ⭐ 9.2
   Clean dorms, great social vibe

2. Deejai Backpackers - $10/night ⭐ 8.8
   Budget-friendly, basic but good

3. Hug Hostel - $14/night ⭐ 9.0
   Modern, quiet, good wifi

[Book on Hostelworld] [Book on Booking.com] [Show on Map]"
```

#### 4.3 Flight/Transport Search
New service: `services/transport.ts`

- Search flights via Skyscanner API
- Search buses via 12go.asia API (Southeast Asia)
- Search trains via Rome2Rio API
- Compare prices across providers

---

### Phase 5: Live Transit Updates

#### 5.1 Real-Time Transit Data

| City/Region | Data Source | Status |
|-------------|-------------|--------|
| Tokyo | NAVITIME API | 🟢 Available |
| Bangkok | BTS/MRT APIs | 🟡 Limited |
| Singapore | LTA DataMall | 🟢 Available |
| Europe | Google Transit | 🟢 Available |
| USA | GTFS Realtime | 🟢 Available |
| Other | Google fallback | 🟡 Schedules only |

#### 5.2 Transit Notification Flow
```
User starts navigation to destination

Tomo monitors:
- Next departure time
- Delays/disruptions
- Platform changes

Notifications:
- "BTS arriving in 2 min - Platform 2"
- "Delay on Sukhumvit Line - take alternate route?"
- "You missed the train - next one in 8 min"
```

---

### Phase 6: Voice Mode

#### 6.1 OpenAI Realtime API Integration
New service: `services/realtime.ts`

```typescript
// WebSocket connection to OpenAI Realtime API
const ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview');

// Streaming audio in/out
// Voice activity detection
// Interrupt handling
```

#### 6.2 Voice Mode Features
- Hands-free conversation with Tomo
- Voice turn-by-turn navigation
- "Hey Tomo" wake word (stretch goal)
- Background audio playback
- Works with AirPods/headphones

#### 6.3 Voice Mode UI
```
┌─────────────────────────────────────┐
│                                     │
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

---

### Phase 7: Offline Mode

#### 7.1 Offline Capabilities

| Feature | Offline Support | Implementation |
|---------|-----------------|----------------|
| Map tiles | ✅ Full | Download region tiles |
| Saved places | ✅ Full | Cache in AsyncStorage |
| Saved routes | ✅ Full | Cache polylines + steps |
| Voice transcription | ✅ Full | On-device Whisper |
| AI chat | ⚠️ Limited | Queue for sync |
| Live transit | ❌ None | Requires internet |

#### 7.2 Offline Data Management
```
Settings > Offline Maps

Downloaded Regions:
┌─────────────────────────────────────┐
│ 🗺️ Chiang Mai          125 MB [✓]  │
│ 🗺️ Bangkok             210 MB [✓]  │
│ 🗺️ Tokyo               450 MB [ ]  │
└─────────────────────────────────────┘

[Download Current Region]

Storage Used: 335 MB / 2 GB
```

---

### Phase 8: Social & Sharing

#### 8.1 Share Features
- Share itinerary with travel buddy
- Export trip as PDF
- Share location in real-time (safety)
- Trip recap (Instagram-style)

#### 8.2 Trip Recap
Auto-generated at end of trip:
```
┌─────────────────────────────────────┐
│ 🌏 Your Thailand Adventure          │
│ December 10-20, 2024                │
├─────────────────────────────────────┤
│ [Photo collage]                     │
├─────────────────────────────────────┤
│ 📍 3 cities visited                 │
│ 🏛️ 12 temples explored              │
│ 🍜 28 meals enjoyed                 │
│ 🚶 47 km walked                     │
│ 💰 ฿15,420 spent                    │
├─────────────────────────────────────┤
│ Top Moments:                        │
│ • Sunrise at Doi Suthep            │
│ • Cooking class in Chiang Mai      │
│ • Full moon party in Koh Phangan   │
├─────────────────────────────────────┤
│ [Share] [Export PDF] [Save Photos] │
└─────────────────────────────────────┘
```

---

### Phase 9: Advanced Features

#### 9.1 Multi-City Trip Planning
```
User: "I have 2 weeks in Southeast Asia, help me plan"

Tomo generates:
- Optimal route between cities
- Flight/bus recommendations
- Time allocation per city
- Visa requirements
- Budget breakdown
```

#### 9.2 Expense Splitting
For group travel:
- Log who paid what
- Multi-currency support
- Auto-calculate settlements
- Export expense report

#### 9.3 Language Assistant
- Camera translation (menus, signs)
- Common phrases for current country
- Pronunciation guide with audio
- "How do I say...?" quick access

#### 9.4 Safety Features
- Embassy contact info
- Emergency services by country
- Travel advisories
- Share live location with emergency contact

---

## Architecture

### Current Services (`/services/`)

| File | API | Purpose |
|------|-----|---------|
| `openai.ts` | OpenAI GPT-4o | Main chat, structured responses |
| `places.ts` | Google Places API | Search, details, photos |
| `routes.ts` | Google Routes API | Walking, Transit, Driving |
| `voice.ts` | Whisper | Voice transcription |
| `weather.ts` | OpenWeatherMap | Current weather |
| `location.ts` | Expo Location | GPS, reverse geocoding |

### New Services (To Build)

| File | API | Purpose |
|------|-----|---------|
| `realtime.ts` | OpenAI Realtime | Voice mode |
| `notifications.ts` | Expo Notifications | Push notifications |
| `transport.ts` | Skyscanner, 12go | Flight/bus search |
| `transit.ts` | Various | Real-time transit |
| `offline.ts` | Local | Offline data management |

### Current Stores (`/stores/`)

| Store | Purpose |
|-------|---------|
| `useConversationStore` | Chat messages |
| `useMemoryStore` | User memories (6 types) |
| `useTripStore` | Multi-city trips |
| `useBudgetStore` | Budget tracking |
| `useLocationStore` | GPS coordinates |
| `useNavigationStore` | Navigation state |
| `usePreferencesStore` | Settings, dietary, temperature |
| `useWeatherStore` | Weather data |
| `useOnboardingStore` | Onboarding state |

### New Stores (To Build)

| Store | Purpose |
|-------|---------|
| `useItineraryStore` | Trip itineraries |
| `useNotificationStore` | Notification queue |
| `useOfflineStore` | Offline data cache |
| `useVoiceModeStore` | Voice mode state |

---

## Environment Variables

```env
# AI
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...

# Google
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...

# Weather
EXPO_PUBLIC_WEATHER_API_KEY=...

# Voice
EXPO_PUBLIC_WHISPER_BACKEND_URL=https://tomo-production-ed80.up.railway.app

# Future
EXPO_PUBLIC_SKYSCANNER_API_KEY=...
EXPO_PUBLIC_12GO_API_KEY=...
```

---

## Quick Commands

```bash
# Development
npx expo start --dev-client --tunnel

# Type check
npx tsc --noEmit

# Build dev client
eas build --profile development --platform ios

# Git
git add -A && git commit -m "message" && git push origin main
```

---

## Session History

### December 16, 2024 (Session 4) - P0/P1 Complete + Roadmap
**Completed:**
- ✅ Fixed system prompt (actual time, global AI, dietary emphasis, no markdown)
- ✅ Added temperature unit preference (C/F)
- ✅ Added place open verification via Google Places API
- ✅ Added search bar to map modal
- ✅ Added chat input to map modal
- ✅ Created comprehensive feature roadmap

**Identified Bugs:**
- 0 min walk time from Routes API
- Google branding in MiniMap/navigation

**Committed:** `7e763c4` - feat: Smart system prompt + temperature unit + map search & chat

### December 16, 2024 (Session 3) - Fixes & Planning
- Fixed distance mismatch (Routes API integration)
- Safe haptics wrapper
- ChatGPT-style messages
- Identified issues with system prompt

### December 16, 2024 (Session 2) - UI Overhaul
- Dark mode (Explorer Teal theme)
- MiniMap component
- TypingIndicator
- Compact header

### December 16, 2024 (Session 1) - Google Maps Fix
- Fixed black screen issue
- Rotated API key

---

## Next Session Checklist

### Immediate (P0)
- [ ] Fix 0 min walk time bug in `services/routes.ts`
- [ ] Remove Google branding from navigation
- [ ] Build new dev client for haptics

### This Week (P1)
- [ ] Notification system foundation
- [ ] Last train warning
- [ ] Itinerary data model
- [ ] "Plan my day" command

### This Month (P2)
- [ ] Deep links to booking apps
- [ ] Voice mode MVP
- [ ] Offline map downloads
- [ ] Trip recap feature

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Fix 0 min walk bug | High | Low | 🔴 P0 |
| Remove Google branding | Medium | Low | 🔴 P0 |
| Notification system | High | Medium | 🟡 P1 |
| Itinerary planning | High | Medium | 🟡 P1 |
| Booking deep links | Medium | Low | 🟡 P1 |
| Voice mode | High | High | 🟢 P2 |
| Offline mode | High | High | 🟢 P2 |
| Live transit | Medium | High | 🟢 P2 |
| Multi-city planning | High | Medium | 🟢 P2 |
| Trip recap | Medium | Medium | 🔵 P3 |
| Expense splitting | Low | Medium | 🔵 P3 |
| Language assistant | Medium | Medium | 🔵 P3 |
