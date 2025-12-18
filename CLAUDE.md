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

## HONEST STATUS ASSESSMENT: ~70% Complete

### What's TRULY Working (End-to-End)

| Feature | Status | Notes |
|---------|--------|-------|
| **Core Chat AI** | ✅ 95% | GPT-4o, context-aware, structured responses |
| **Place Discovery** | ✅ 95% | Google Places, photos, ratings, open status |
| **Navigation** | ✅ 80% | Turn-by-turn with compass, chat is real AI now |
| **Map Explorer** | ✅ 95% | Categories, search, selection, markers |
| **Settings** | ✅ 90% | Preferences, personality, notifications toggles |

### What's "Beautiful Shell" (UI Built, Logic Not Wired)

| Feature | UI Status | Logic Status | Gap |
|---------|-----------|--------------|-----|
| **Itinerary** | ✅ Complete | ⚠️ 50% | Chat modifications don't work |
| **Notifications** | ✅ Complete | ⚠️ 10% | ZERO triggers implemented |
| **Memory** | ⚠️ Basic | ⚠️ 30% | Not auto-populated from chat |
| **Offline Mode** | ✅ Complete | ⚠️ 40% | Store built, never checked in flows |
| **Saved Places** | ❌ None | ❌ 0% | No UI, memory store only |

### What's NOT Started

| Feature | Priority | Why Essential |
|---------|----------|---------------|
| **Voice Mode** | High | Hands-free while walking |
| **Booking Integrations** | High | Recommendations → action |
| **Map Tile Caching** | Medium | True offline maps |
| **Saved Places UI** | Medium | Bookmark spots for later |
| **Push Notifications** | Medium | Proactive alerts |

---

## NEXT SESSION: Wire the Beautiful Shells

### Priority 1: Notification Triggers (HIGH IMPACT)
The notification system UI is complete but nothing triggers notifications:

```typescript
// What exists:
useNotificationStore.ts - stores notifications
NotificationToast.tsx - displays toasts
app/notifications.tsx - list screen
Sidebar.tsx - shows unread count

// What's MISSING:
- Last train warning trigger
- Place closing soon trigger
- Weather change trigger
- Itinerary reminder trigger
- Budget threshold trigger
```

**Implementation needed:**
1. Create `hooks/useNotificationTriggers.ts`
2. Add to `_layout.tsx` to run in background
3. Check conditions every 30-60 seconds
4. Add notifications via `addNotification()`

### Priority 2: Memory Auto-Extraction
Memory doesn't learn from conversations automatically:

```typescript
// What exists:
useMemoryStore.ts - stores memories
Memory.tsx screen - view/edit memories

// What's MISSING:
- Post-chat hook to extract memories
- "Tomo learned: you love spicy food"
- Auto-detect dietary restrictions, interests, dislikes
```

### Priority 3: Itinerary Chat Modifications
The chat input at bottom of itinerary screen is decoration:

```typescript
// What exists:
app/itinerary.tsx - full UI with chat input

// What's MISSING:
- Connect chat input to AI
- Parse modification requests
- Update itinerary via store
```

### Priority 4: Offline Mode Activation
Store exists but never used:

```typescript
// What exists:
useOfflineStore.ts - caching logic
OfflineBanner.tsx - UI component

// What's MISSING:
- Check isOnline before API calls
- Use cached data when offline
- Queue messages when offline
- Sync on reconnect
```

---

## Technical Architecture

### Services (`/services/`)
| File | Status | Notes |
|------|--------|-------|
| `openai.ts` | ✅ Built | Chat + navigation chat + itinerary generation |
| `places.ts` | ✅ Built | Google Places API |
| `routes.ts` | ✅ Built | Google Routes API |
| `voice.ts` | ✅ Built | Whisper transcription |
| `weather.ts` | ✅ Built | OpenWeatherMap |
| `location.ts` | ✅ Built | GPS + geocoding |
| `realtime.ts` | ❌ TODO | OpenAI Realtime (voice mode) |

### Stores (`/stores/`)
| Store | Status | Wired? |
|-------|--------|--------|
| `useConversationStore` | ✅ Built | ✅ Yes |
| `useMemoryStore` | ✅ Built | ⚠️ Manual only |
| `useTripStore` | ✅ Built | ✅ Yes |
| `useBudgetStore` | ✅ Built | ✅ Yes |
| `useLocationStore` | ✅ Built | ✅ Yes |
| `useNavigationStore` | ✅ Built | ✅ Yes |
| `usePreferencesStore` | ✅ Built | ✅ Yes |
| `useWeatherStore` | ✅ Built | ✅ Yes |
| `useNotificationStore` | ✅ Built | ⚠️ UI only, no triggers |
| `useItineraryStore` | ✅ Built | ⚠️ Partial |
| `useOfflineStore` | ✅ Built | ⚠️ Never checked |

### Key Files
| File | What it does | Status |
|------|--------------|--------|
| `app/index.tsx` | Main chat screen | ✅ Working |
| `app/map.tsx` | Map explorer | ✅ Working |
| `app/navigation.tsx` | Turn-by-turn navigation | ✅ Working (chat fixed) |
| `app/itinerary.tsx` | Itinerary screen | ⚠️ UI only |
| `app/notifications.tsx` | Notification list | ⚠️ No triggers |
| `app/settings.tsx` | User settings | ✅ Working |
| `components/PlaceCard.tsx` | Place recommendation cards | ✅ Working |
| `components/NotificationToast.tsx` | Animated toasts | ✅ Working |
| `components/OfflineBanner.tsx` | Offline indicator | ⚠️ Never shown |

---

## The Gap to World-Class

### What We Have That Competitors Don't
1. **Conversational AI** - No travel app has this at our level
2. **Context Fusion** - Location + weather + time + budget in every response
3. **Single App** - Everything in one place
4. **Personality** - Feels like a friend, not a tool

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
| Proactive Alerts | ❌ | ❌ | ❌ | ⚠️ |

---

## Development Priorities

### TIER 1: Wire What's Built (Next 1-2 Sessions)
*Embarrassing gaps - UI exists but doesn't work*

| Task | Impact | Effort |
|------|--------|--------|
| Notification triggers | High | Medium |
| Memory auto-extraction | Medium | Medium |
| Itinerary chat modifications | High | Low |
| Offline mode activation | Medium | Medium |

### TIER 2: Essential New Features (Sessions 3-5)
*Features that make Tomo indispensable*

| Feature | Why Essential |
|---------|---------------|
| **Saved Places UI** | Users need to bookmark spots |
| **Voice Mode** | Hands-free while walking |
| **Photo Translation** | Point at menu, instant translation |
| **Push Notifications** | Proactive value |

### TIER 3: Competitive Features (Future)
*Features that make Tomo better than alternatives*

| Feature | Why Important |
|---------|---------------|
| **Booking Deep Links** | "Book this" → OpenTable/Uber |
| **Offline Maps** | True offline with downloaded tiles |
| **Trip Sharing** | Share itinerary with friends |

---

## Session History

### Session 9 (December 18, 2024) - Major Feature Implementation + Analysis
**Built:**
- ✅ Real navigation chat (replaced hardcoded responses)
- ✅ Action buttons (Take me there, Something else, Add to itinerary, Save)
- ✅ Full itinerary UI (day tabs, time slots, activity cards)
- ✅ Notification system UI (toasts, list screen, sidebar indicator)
- ✅ Tomo personality settings
- ✅ Notification preferences
- ✅ Translation chip
- ✅ Offline mode store + banner
- ✅ Skeleton loaders

**Analysis revealed:** Many features are "beautiful shells" - UI complete but logic not wired

**Files created:**
- `components/NotificationToast.tsx`
- `components/OfflineBanner.tsx`
- `components/SkeletonLoader.tsx`
- `app/notifications.tsx`
- `stores/useOfflineStore.ts`
- `ROADMAP.md`

### Session 8 (December 18, 2024) - Google Maps & Navigation
- Switched to Google Maps everywhere
- Google Maps-style navigation with compass rotation
- Magnetometer integration for heading
- Re-center button when user pans

### Sessions 1-7
- Core chat AI implementation
- Google Places/Routes integration
- PlaceCard design iterations
- Quick Actions Menu
- Sidebar navigation
- Dark mode theme

---

## Quick Commands

```bash
# Development
npx expo start --dev-client --tunnel

# Type check
npx tsc --noEmit

# Build dev client (after adding native modules)
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
- Tomo knows them (preferences, history) ← memory not auto-populated
- Tomo knows the city (places, transit, customs) ✅
- Tomo is always available (offline works) ← not wired
- Tomo is hands-free (voice works) ← not started
- Tomo takes action (booking works) ← not started
- Tomo is proactive (notifications work) ← no triggers

We're 70% there. The last 30% is what separates "nice app" from "can't travel without it."
