# Tomo - Strategic Roadmap to World-Class Travel Companion

## The Vision
**Tomo should be the ONLY app a traveler needs.**

Not Google Maps + TripAdvisor + Translate + ChatGPT + Booking.com.
Just Tomo.

---

## Current State Assessment

### Completion: ~70%

| Category | Status | Notes |
|----------|--------|-------|
| **Core Chat AI** | 95% ✅ | GPT-4o integration, context-aware, structured responses |
| **Place Discovery** | 95% ✅ | Google Places, photos, ratings, real-time open status |
| **Navigation** | 80% ⚠️ | Turn-by-turn works, BUT chat during nav is fake |
| **Map Explorer** | 95% ✅ | Categories, search, selection, markers |
| **Itinerary** | 70% ⚠️ | UI complete, BUT chat modifications broken |
| **Notifications** | 30% ⚠️ | UI complete, BUT zero triggers implemented |
| **Memory System** | 40% ⚠️ | Store exists, BUT not auto-populated from chat |
| **Offline Mode** | 40% ⚠️ | Store exists, BUT never checked/used |
| **Voice Mode** | 0% ❌ | Not started |
| **Booking** | 0% ❌ | Not started |
| **Saved Places** | 20% ⚠️ | Memory store exists, no dedicated UI |

---

## What's Actually Working (Honest Assessment)

### ✅ FULLY FUNCTIONAL
1. **Chat → Recommendation → Navigation Flow**
   - User asks "find me food" → AI responds with PlaceCard → "Take me there" → Full navigation

2. **Context Awareness**
   - GPS location with city detection
   - Weather integration
   - Time-of-day context
   - Budget tracking
   - User preferences in prompts

3. **Map Explorer**
   - Category filtering (Food, Coffee, Drinks, Sights, Shopping, Nature)
   - Place search
   - Google Maps with dark theme

4. **Settings & Preferences**
   - Home base, budget, dietary restrictions, interests
   - Temperature units, walking tolerance
   - All persists to AsyncStorage

5. **Conversation Management**
   - Multiple conversations, switching, deletion
   - Message history preserved

### ⚠️ PARTIALLY WORKING (UI exists, logic missing)
1. **Navigation Chat** - Beautiful overlay, but responses are hardcoded
2. **Itinerary Modifications** - Can add activities, can't modify via chat
3. **Notifications** - Screen exists, nothing ever triggers them
4. **Memory** - Can manually add, doesn't auto-learn from conversations
5. **Offline Banner** - Shows up, but app doesn't actually work offline

### ❌ NOT STARTED
1. Voice Mode (OpenAI Realtime API)
2. Booking Integrations (deep links)
3. Saved Places Map View
4. Photo Translation
5. Push Notifications (triggers)

---

## The Gap to World-Class

### What Competitors Have That We Don't

| Feature | Google Maps | TripAdvisor | Booking.com | Tomo |
|---------|-------------|-------------|-------------|------|
| AI Chat | ❌ | ❌ | ❌ | ✅ |
| Place Discovery | ✅ | ✅ | ✅ | ✅ |
| Navigation | ✅ | ❌ | ❌ | ✅ |
| Offline Maps | ✅ | ❌ | ❌ | ⚠️ |
| Booking | ❌ | ✅ | ✅ | ❌ |
| Voice Control | ✅ | ❌ | ❌ | ❌ |
| Saved Places | ✅ | ✅ | ✅ | ⚠️ |
| Reviews | ✅ | ✅ | ✅ | ✅ (via API) |
| Itinerary Planning | ❌ | ✅ | ❌ | ⚠️ |
| Proactive Alerts | ❌ | ❌ | ❌ | ⚠️ |

### Our Unique Advantages
1. **Conversational AI** - No other travel app has this at our level
2. **Context Fusion** - Location + weather + time + budget + preferences in every response
3. **Single App Philosophy** - Everything in one place
4. **Personality** - Tomo feels like a friend, not a tool

---

## Strategic Priorities

### TIER 1: WIRE WHAT'S BUILT (Week 1-2)
*These are embarrassing gaps - UI exists but doesn't work*

| Task | Impact | Effort | Status |
|------|--------|--------|--------|
| Navigation chat → real AI | High | Low | Ready to wire |
| Itinerary chat modifications | High | Low | Ready to wire |
| Notification triggers | High | Medium | Triggers needed |
| Memory auto-extraction | Medium | Medium | Hook needed |
| Offline mode activation | Medium | Medium | Check network |
| Personality in prompts | Low | Low | Read preferences |

### TIER 2: ESSENTIAL NEW FEATURES (Week 2-4)
*Features that make Tomo indispensable*

| Feature | Why Essential | Effort |
|---------|---------------|--------|
| **Saved Places** | Users need to bookmark spots for later | Medium |
| **Voice Mode** | Hands-free while walking is critical | High |
| **Photo Translation** | Point at menu/sign, instant translation | Medium |
| **Push Notifications** | Proactive value (last train, rain) | Medium |

### TIER 3: COMPETITIVE FEATURES (Month 2)
*Features that make Tomo better than alternatives*

| Feature | Why Important |
|---------|---------------|
| **Booking Deep Links** | "Book this restaurant" → OpenTable |
| **Offline Maps** | True offline with downloaded tiles |
| **AR Overlay** | Point phone, see place info |
| **Trip Sharing** | Share itinerary with friends |

### TIER 4: DELIGHT FEATURES (Month 3+)
*Features that make users love Tomo*

- Local customs & etiquette tips
- Scam warnings for tourist areas
- Local SIM card recommendations
- Transit card info by city
- Emergency numbers & embassy locations
- Phrasebook with audio pronunciation

---

## Feature Deep Dives

### Saved Places System

**Why Essential:** Every traveler bookmarks places. Currently we have "Save for later" that adds to memory, but no way to VIEW saved places.

**Implementation:**
```
/stores/useSavedPlacesStore.ts
- savedPlaces: PlaceCardData[]
- addPlace(place)
- removePlace(placeId)
- getPlacesByCategory()
- getPlacesNearLocation()

/app/saved.tsx
- List view with filters (by category, by city)
- Map view showing all saved places
- Swipe to remove
- Tap to navigate

/components/SaveButton.tsx
- Heart icon on PlaceCard
- Toggle saved status
- Haptic feedback
```

**Integration Points:**
- PlaceCard: Add heart/bookmark icon
- Map screen: Filter to show only saved places
- Chat: "Show me my saved places"

### Voice Mode

**Why Essential:** When walking around a foreign city, typing is hard. Voice is natural.

**Implementation:**
```
/services/realtime.ts
- OpenAI Realtime API WebSocket
- Voice Activity Detection (VAD)
- Streaming audio input
- Streaming audio output
- Interrupt handling

/app/voice.tsx
- Full-screen listening UI
- Waveform visualization
- Transcription preview
- "Tap to type" fallback

/components/VoiceButton.tsx
- Mic icon in header
- Hold to talk mode
- Visual feedback during listening
```

**Key Challenges:**
- Background audio on iOS
- AirPods support
- Battery optimization
- Noise cancellation

### Booking Integrations

**Why Essential:** Recommendations are useless if you can't act on them.

**Implementation Strategy:** Deep links, not full API integration

```
Restaurant Booking:
- OpenTable: opentable://restaurant?rid={id}
- Resy: resy://venue/{id}
- Google: https://www.google.com/maps/reserve/...

Hotel Booking:
- Booking.com: booking://hotel/{id}
- Agoda: agoda://hotel/{id}

Transport:
- Uber: uber://?action=setPickup&...
- Grab: grab://open?...
- Lyft: lyft://ridetype?...

Flights:
- Google Flights: https://www.google.com/travel/flights?...
- Skyscanner: skyscanner://...
```

**UI Integration:**
- PlaceCard: "Book" button for restaurants with reservations
- Chat: "Book this" action button
- Detect booking intent: "I want to book..." → deep link

### Offline Mode (Full)

**Why Essential:** Travelers lose signal constantly - tunnels, remote areas, airplane mode to avoid roaming.

**Implementation:**
```
Phase 1: Data Caching (Current)
- Cache place details when viewed ✓
- Cache routes when navigated ✓
- Queue messages when offline ✓

Phase 2: Offline Detection (Needed)
- Network status listener
- Graceful degradation
- Sync when back online

Phase 3: Map Tile Caching (Advanced)
- Download region tiles
- Persist to device storage
- "Download for offline" button
- Storage management UI
```

**User Flow:**
1. User views place → auto-cached for 24 hours
2. User loses signal → banner shows "Offline - cached data available"
3. User can still navigate to cached places
4. Messages queue and send when online
5. Optional: "Download this area" for map tiles

---

## Success Metrics

### MVP Complete (Tier 1 + 2)
- [ ] Navigation chat uses real AI
- [ ] Itinerary modifications work
- [ ] At least 3 notification triggers active
- [ ] Memory auto-populates from chat
- [ ] Offline banner shows and cached data works
- [ ] Saved places with map view
- [ ] Voice mode basic functionality

### Product-Market Fit
- [ ] User completes full trip using only Tomo
- [ ] User returns for second trip
- [ ] User recommends to friend
- [ ] 4.5+ App Store rating

### World-Class
- [ ] Booking integrations for top 5 platforms
- [ ] Full offline maps for major cities
- [ ] AR overlay working
- [ ] <3 second response time
- [ ] Works in 20+ countries

---

## Technical Debt

### Must Fix
1. **Navigation chat fake responses** - Embarrassing if discovered
2. **Itinerary chat dead-end** - Broken user flow
3. **Notification store unused** - Wasted code
4. **SkeletonLoader unused** - Built but not integrated

### Should Fix
1. Memory screen not discoverable (hidden in settings)
2. Trip recap PDF export stubbed
3. No loading states in many places
4. Error handling inconsistent

### Nice to Fix
1. Animation smoothness
2. Keyboard avoiding view issues
3. Deep link handling

---

## The North Star

**When a traveler lands in a new city, Tomo should be:**
1. The FIRST app they open (not Google Maps)
2. The ONLY app they need for the day
3. The app they TELL their friends about

**This happens when:**
- Tomo knows them (preferences, history)
- Tomo knows the city (places, transit, customs)
- Tomo is always available (offline works)
- Tomo is hands-free (voice works)
- Tomo takes action (booking works)
- Tomo is proactive (notifications work)

We're 70% there. The last 30% is what separates "nice app" from "can't travel without it."
