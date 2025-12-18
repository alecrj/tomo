# Tomo - AI Travel Companion

## The Vision

**Tomo = The ONLY app a traveler needs**

Not Google Maps + TripAdvisor + Translate + ChatGPT + Booking.com. Just Tomo.

A travel companion that:
- Answers ANY question (general AI + travel superpowers)
- Knows your location, time, weather, budget in real-time
- Works for planners AND spontaneous travelers
- Works offline when you lose signal
- Takes action (navigate, book, remind)
- Feels like a local friend, not a tool

**Core Philosophy:** Minimum friction, maximum value. Every feature must earn its place.

---

## HONEST STATUS ASSESSMENT: ~55-60% Actually Working

> **Previous claim of 95% was WRONG.** This is a FAANG-level honest assessment of what actually works end-to-end vs what's just code that exists.

### Truly Working End-to-End

| Feature | Status | Confidence | Notes |
|---------|--------|------------|-------|
| **Core Chat AI** | ✅ 90% | HIGH | GPT-4o, structured responses, context-aware |
| **Place Discovery** | ✅ 90% | HIGH | Google Places, photos, ratings, open status |
| **Navigation** | ✅ 85% | MEDIUM | Needs real device testing (compass) |
| **Map Explorer** | ✅ 85% | HIGH | Categories, search, selection |
| **Settings** | ✅ 90% | HIGH | All preferences persist |
| **Saved Places** | ✅ 80% | MEDIUM | Complete but newly built, needs testing |

### Code Exists But NOT Actually Working

| Feature | Code Status | Actually Works | Critical Issue |
|---------|-------------|----------------|----------------|
| **Offline Mode** | 40% | **0%** | Store exists, **NO SERVICE CHECKS IT** |
| **Voice Realtime** | 100% | **5%** | **Requires paid OpenAI tier** |
| **Voice Whisper** | 70% | **0%** | **Requires you to deploy a backend** |
| **Memory Extraction** | 100% | **25%** | Regex patterns only - misses most natural language |
| **Notification Triggers** | 100% | **30%** | Code runs but needs data to trigger |
| **Itinerary Chat** | 100% | **50%** | Untested end-to-end |
| **Booking Links** | 100% | **50%** | Deep links untested on real devices |

---

## CRITICAL GAPS (Why We're NOT at 95%)

### 1. Offline Mode is COMPLETELY BROKEN

```typescript
// What EXISTS:
useOfflineStore.ts → checkNetworkStatus() runs every 30s
initNetworkListener() is called in _layout.tsx
OfflineBanner.tsx exists

// What's MISSING:
// services/openai.ts  → NEVER checks isOnline
// services/places.ts  → NEVER checks isOnline
// services/routes.ts  → NEVER checks isOnline

// RESULT: When user goes offline:
// - No banner shows (no trigger)
// - Chat still tries API calls (and fails)
// - No fallback to cached data
// - Messages aren't queued
```

**Fix needed:** Every service must check `useOfflineStore.getState().isOnline` before API calls and use cached data / queue messages when offline.

### 2. Voice Features Require External Infrastructure

**Realtime API (voice mode):**
```typescript
// services/realtime.ts connects to: wss://api.openai.com/v1/realtime
// This requires:
// 1. OpenAI API key with Realtime API access (paid tier)
// 2. The model 'gpt-4o-realtime-preview-2024-12-17' to be available
// Without this, the voice.tsx screen will show "Connection error"
```

**Whisper Transcription:**
```typescript
// services/voice.ts requires:
const backendUrl = process.env.EXPO_PUBLIC_WHISPER_BACKEND_URL;
// Without this URL, transcribeAudio() returns null

// You must deploy a backend like:
// POST /transcribe - accepts audio file, returns { text: "transcription" }
```

### 3. Memory Extraction Only Catches Exact Phrases

```typescript
// Pattern examples from hooks/useMemoryExtraction.ts:
/i(?:'m|'m| am) (vegetarian|vegan|pescatarian)/i  // ✅ "I'm vegetarian"
/i (?:can't|cannot|don't|do not) eat (\w+)/i       // ✅ "I can't eat pork"

// What it MISSES:
"I try to avoid meat" ❌
"No beef for me" ❌
"I'm trying to eat healthier" ❌
"We're traveling with kids" ✅ (has pattern)
"My daughter is allergic to nuts" ❌

// Coverage: ~25% of natural language about preferences
```

### 4. Notification Triggers Need Data to Fire

The triggers run every 30 seconds but require:

| Trigger | Requirement | In Fresh App |
|---------|-------------|--------------|
| Budget warning | User must set budget AND log spending | ❌ Empty |
| Weather alert | Weather must be fetched AND change | ❌ No fetch trigger |
| Itinerary reminder | User must create itinerary with times | ❌ Empty |
| Place closing | Activity must have place with hours | ❌ No activities |

**In a fresh app with no user data, ZERO notifications will ever fire.**

---

## API Requirements

| Environment Variable | Required For | Status |
|---------------------|--------------|--------|
| `EXPO_PUBLIC_OPENAI_API_KEY` | All AI features | **REQUIRED** |
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | Places, photos, open status | **REQUIRED** |
| `EXPO_PUBLIC_WEATHER_API_KEY` | Weather data | Optional (has mock fallback) |
| `EXPO_PUBLIC_WHISPER_BACKEND_URL` | Voice-to-text transcription | **REQUIRES BACKEND DEPLOYMENT** |

### OpenAI Realtime API Note
The voice mode uses the OpenAI Realtime API which may require:
- A paid OpenAI account with specific tier access
- The model `gpt-4o-realtime-preview-2024-12-17` to be available to your account

---

## What Needs to Be Done

### CRITICAL (Blocking Core Features)

| Task | Impact | Effort |
|------|--------|--------|
| Wire offline mode into services | High | Medium |
| Add offline fallbacks to chat | High | Medium |
| Show OfflineBanner when actually offline | High | Low |
| Test voice mode with Realtime API access | High | Medium |

### HIGH PRIORITY (Features Don't Work)

| Task | Impact | Effort |
|------|--------|--------|
| Document Whisper backend requirements or create one | High | Medium |
| Test booking deep links on iOS/Android devices | Medium | Low |
| Test itinerary modification flow E2E | Medium | Low |
| Improve memory extraction (AI-based or more patterns) | Medium | Medium |

### MEDIUM PRIORITY (Polish)

| Task | Impact | Effort |
|------|--------|--------|
| Add initial data seeding for notifications to fire | Medium | Low |
| Test navigation compass on real device | Medium | Low |
| Test saved places flow E2E | Low | Low |

---

## Technical Architecture

### Services (`/services/`)
| File | Code | Works E2E | Notes |
|------|------|-----------|-------|
| `openai.ts` | ✅ | ✅ 90% | Chat + itinerary + navigation chat |
| `places.ts` | ✅ | ✅ 90% | Google Places API |
| `routes.ts` | ✅ | ✅ 85% | Google Routes API |
| `weather.ts` | ✅ | ✅ 80% | Has mock fallback |
| `location.ts` | ✅ | ✅ 85% | GPS + geocoding |
| `voice.ts` | ✅ | ❌ 0% | **Needs backend** |
| `realtime.ts` | ✅ | ❌ 5% | **Needs paid tier** |
| `booking.ts` | ✅ | ⚠️ 50% | Untested deep links |

### Stores (`/stores/`)
| Store | Code | Wired | Actually Used |
|-------|------|-------|---------------|
| `useConversationStore` | ✅ | ✅ | ✅ |
| `useMemoryStore` | ✅ | ✅ | ⚠️ Pattern extraction only |
| `useTripStore` | ✅ | ✅ | ✅ |
| `useBudgetStore` | ✅ | ✅ | ✅ |
| `useLocationStore` | ✅ | ✅ | ✅ |
| `useNavigationStore` | ✅ | ✅ | ✅ |
| `usePreferencesStore` | ✅ | ✅ | ✅ |
| `useWeatherStore` | ✅ | ✅ | ✅ |
| `useNotificationStore` | ✅ | ✅ | ⚠️ Needs data to trigger |
| `useItineraryStore` | ✅ | ✅ | ⚠️ Mods untested |
| `useOfflineStore` | ✅ | ✅ | ❌ **Not checked by services** |
| `useSavedPlacesStore` | ✅ | ✅ | ✅ New |

### Key Hooks
| Hook | Purpose | Status |
|------|---------|--------|
| `useNotificationTriggers` | Background notification checks | ⚠️ Runs but needs data |
| `useMemoryExtraction` | Auto-learn from chat | ⚠️ Limited pattern coverage |

---

## What DOES Work Well

### The Core Experience is Strong

1. **Chat AI (90% working)**
   - Full context injection (location, weather, budget, time)
   - Structured JSON responses with place cards
   - Place verification via Google Places API
   - Walking distance correction via Routes API
   - Photo fetching from Google Places

2. **Place Discovery (90% working)**
   - Category-based browsing
   - Text search
   - Real photos, ratings, hours
   - Open/closed status

3. **Navigation (85% working)**
   - Turn-by-turn directions
   - Compass rotation (needs device testing)
   - AI chat during navigation
   - Route recalculation

4. **Saved Places (80% working)**
   - Full list/map UI
   - Filter by nearby/visited
   - Mark visited, delete, navigate

---

## What Competitors Have That We Don't Have Working

| Feature | Google Maps | TripAdvisor | Tomo |
|---------|-------------|-------------|------|
| AI Chat | ❌ | ❌ | ✅ |
| Place Discovery | ✅ | ✅ | ✅ |
| Navigation | ✅ | ❌ | ✅ |
| **TRUE Offline** | ✅ | ❌ | ❌ |
| Booking | ❌ | ✅ | ⚠️ |
| **Voice Control** | ✅ | ❌ | ❌ |
| Saved Places | ✅ | ✅ | ✅ |
| **Proactive Alerts** | ❌ | ❌ | ⚠️ |

---

## Session History

### Session 10 (December 18, 2024) - FAANG Analysis
**Honest assessment revealed:**
- Previous 95% claim was incorrect
- Offline mode completely broken (store exists, never used)
- Voice features require external infrastructure
- Memory extraction is regex-only
- Notification triggers need user data to fire

### Session 10 Earlier - Wiring Features
**Code created:**
- `hooks/useNotificationTriggers.ts` - Background triggers
- `hooks/useMemoryExtraction.ts` - Pattern-based extraction
- `stores/useSavedPlacesStore.ts` - Saved places
- `app/saved.tsx` - Saved places UI
- `app/voice.tsx` - Voice mode UI
- `services/realtime.ts` - OpenAI Realtime WebSocket
- `services/booking.ts` - Deep link generators
- Added `modifyItinerary()` to `services/openai.ts`
- Wired BackgroundTriggers in `app/_layout.tsx`

### Session 9 (December 18, 2024)
- Real navigation chat (replaced hardcoded)
- Full itinerary UI
- Notification system UI
- Offline mode store + banner

### Session 8 (December 18, 2024)
- Google Maps integration
- Compass-based navigation
- Magnetometer for heading

### Sessions 1-7
- Core chat AI
- Google Places/Routes integration
- PlaceCard design
- Sidebar navigation
- Dark mode theme

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

## The North Star

**When a traveler lands in a new city, Tomo should be:**
1. The FIRST app they open (not Google Maps)
2. The ONLY app they need for the day
3. The app they TELL their friends about

**This happens when:**
| Requirement | Status | Gap |
|-------------|--------|-----|
| Tomo knows them | ⚠️ 25% | Memory extraction too limited |
| Tomo knows the city | ✅ 90% | Google APIs working |
| Tomo is always available | ❌ 0% | Offline mode not wired |
| Tomo is hands-free | ❌ 5% | Voice needs paid API |
| Tomo takes action | ⚠️ 50% | Deep links untested |
| Tomo is proactive | ⚠️ 30% | Triggers need data |

**We're 55-60% there.** The core chat and place discovery work great. Everything else needs real work to be production-ready.
