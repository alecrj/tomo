# Tomo — AI Travel Companion for Tokyo

**Status**: ✅ Feature-complete MVP ready for testing

Tomo is an AI-powered travel companion that replaces Google Maps + ChatGPT + travel guides with one app. Open Tomo, see what to do right now, get directions, and explore with confidence.

## The Core Idea

Instead of endless research and decision paralysis, Tomo tells you:
- **What** to do right now (one perfect destination)
- **Why** it's perfect (weather, time, budget, energy level)
- **How** to get there (transit with last train warnings)
- **What** to do when you arrive (area-aware AI chat)

## Key Features

### 🤖 AI Destination Generation
- Claude generates **one contextual destination** based on:
  - Current location, time, weather
  - Budget remaining, walking done today
  - User preferences (dietary, interests)
  - Visit history
- "Something else" button excludes destinations for the day
- Always contextual, never generic

### 🗺️ Smart Navigation
- Transit directions with **real train/bus lines**
- Step-by-step instructions with platform info
- Route visualization on interactive map
- Arrival detection (50m geofence)
- Walking fallback when transit unavailable

### ⚠️ Last Train Warnings (THE MOAT)
- Extracts actual last train times from Google Routes API
- **Proactive warnings at 90/60/30 minutes before last train**
- Prevents getting stranded late at night
- Contextual "get directions home" when urgent

### 💬 Companion Mode
- Area-aware chat when you arrive at destination
- Ask questions, get recommendations
- Quick actions: Scan menus, log expenses, explore nearby
- Claude has full context about where you are

### 💰 Budget Tracking
- Set trip budget and duration
- See daily budget allocation
- Log expenses by category
- Real-time budget bar on home screen
- Soft limits (Claude suggests going over if worth it)

### ⚙️ Smart Preferences
- Home base (for last train warnings)
- Walking tolerance (affects distance suggestions)
- Dietary restrictions (affects food suggestions)
- Interests (influences destination categories)
- Avoid crowds preference

## Screens

1. **Home** → AI-generated destination card, budget bar, quick actions
2. **Destination Detail** → Photos, hours, spots, "why now" explanation
3. **Navigation** → Map with route, step-by-step instructions, warnings
4. **Companion Mode** → Chat with Claude, log expenses, explore area
5. **Settings** → Configure preferences, budget, home base

## Tech Stack

- **React Native** + Expo + TypeScript
- **Zustand** for state management (persisted via AsyncStorage)
- **Claude API** for AI generation and chat
- **Google Places API (New)** for place data and enrichment
- **Google Routes API** for transit directions and last train times
- **OpenWeatherMap** for real-time weather (optional)
- **react-native-maps** for map visualization
- **Lucide** icons (no emojis in UI)

## Architecture Highlights

### State Management
- **useDestinationsStore** - Single destination (not array), exclusion tracking
- **useNavigationStore** - State machine: idle → viewing → navigating → companion
- **useWarningsStore** - Proactive alerts (last train, closing times, weather)
- **useBudgetStore** - Trip budget, daily allocation, expense tracking
- **usePreferencesStore** - User preferences, home base, interests
- **useTripStore** - Visit history, walking minutes
- **useStampsStore** - Multi-city checklist (not yet built)

### Services
- **claude.ts** - AI destination generation + chat (REST API, not SDK for RN compatibility)
- **places.ts** - Google Places API for enrichment
- **routes.ts** - Google Routes API for transit directions + last train detection
- **weather.ts** - OpenWeatherMap integration

### Hooks
- **useDestinationGeneration** - Orchestrates AI with full app context
- **useLocation** - Location tracking with expo-location
- **useWeather** - Weather data (real or mock)
- **useTimeOfDay** - Morning/afternoon/evening/night based on hour

## Setup & Testing

See **[TESTING.md](./TESTING.md)** for complete testing instructions.

Quick start:
```bash
# Install
npm install

# Configure API keys
cp .env.example .env
# Add your Claude API key and Google Places API key

# Run
npx expo start
```

## What's Complete

✅ Claude AI destination generation (contextual, real-time)
✅ Transit navigation with Google Routes API
✅ Last train warnings (90/60/30 min alerts) - **THE MOAT**
✅ Arrival detection & companion mode
✅ Area-aware chat with Claude
✅ Settings configuration
✅ Destination detail screen
✅ Add expense modal
✅ Budget tracking end-to-end
✅ Visit history tracking
✅ Weather integration
✅ Setup validation & error handling

## What's Not Built Yet (Optional)

- **Stamps Screen** - Multi-city checklist (Tokyo Essentials, Kyoto, Osaka)
- **Onboarding Flow** - First-time setup wizard
- **Camera Integration** - Menu/sign scanning with Claude vision
- **Walking Directions Fallback** - When transit not available
- **Offline Caching** - For limited connectivity
- **Animations & Polish** - Micro-interactions, transitions

## Design Principles

- **Premium aesthetic** - Airbnb/Uber level quality
- **Contextual, not generic** - Every suggestion is specific and timely
- **One confident recommendation** - Not 10 options to choose from
- **Proactive, not reactive** - Warnings before problems happen
- **Companion, not checklist** - Organic discovery over rigid itineraries

## Why It's Different

Traditional travel apps show you **everything nearby**. You still have to:
- Research each option
- Check hours, reviews, directions
- Decide what's worth your time
- Plan the logistics

Tomo shows you **one perfect thing right now**. It already:
- Checked the weather, time, and your energy
- Verified it's open and within budget
- Knows how to get you there (and back home)
- Can answer questions when you arrive

It's like having a local friend who just texts you: "Go to this izakaya in Shimokitazawa right now. Trust me."

## The Moat

**Last train warnings** are the killer feature. Every travel app shows you how to get places. None tell you when you need to leave to get home.

Tomo:
1. Extracts last train times from Google Routes API
2. Calculates time until last train
3. Shows proactive warnings (90/60/30 min)
4. Offers "get directions home" when urgent

This is **expensive to build correctly** (requires parsing transit data, time calculations, proactive triggers) and **extremely valuable** (prevents getting stranded).

## Project Structure

```
tomo/
├── app/                      # Expo Router screens
│   ├── index.tsx            # Home screen
│   ├── settings.tsx         # Settings
│   ├── destination.tsx      # Destination detail
│   ├── navigation.tsx       # Navigation with map
│   └── companion.tsx        # Companion mode chat
├── components/              # Reusable components
│   ├── AnimatedBackground.tsx
│   ├── Header.tsx
│   ├── BudgetBar.tsx
│   ├── DestinationCard.tsx
│   ├── AddExpenseModal.tsx
│   └── SetupWarning.tsx
├── services/                # External APIs
│   ├── claude.ts           # Claude AI
│   ├── places.ts           # Google Places
│   ├── routes.ts           # Google Routes
│   └── weather.ts          # OpenWeatherMap
├── stores/                  # Zustand stores
│   ├── useDestinationsStore.ts
│   ├── useNavigationStore.ts
│   ├── useWarningsStore.ts
│   ├── useBudgetStore.ts
│   ├── usePreferencesStore.ts
│   └── useTripStore.ts
├── hooks/                   # Custom hooks
│   ├── useDestinationGeneration.ts
│   ├── useLocation.ts
│   ├── useWeather.ts
│   └── useTimeOfDay.ts
├── types/                   # TypeScript types
│   └── index.ts
├── constants/               # Theme, config
│   ├── theme.ts
│   └── config.ts
├── utils/                   # Utilities
│   ├── polyline.ts         # Polyline decoder
│   └── setupCheck.ts       # API validation
├── CLAUDE.md               # Project vision
├── TESTING.md              # Testing guide
└── README.md               # This file
```

## Contributing

This is a personal project built as a proof-of-concept. Feel free to fork and adapt for your own use.

## License

MIT

---

Built with Claude Code • Powered by Claude Sonnet 4.5
