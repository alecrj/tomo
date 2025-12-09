# Tomo — AI Travel Companion (Global)

## Vision
Replace Google Maps + ChatGPT + travel guides with one app. User opens Tomo anywhere in the world, sees what to do right now, asks questions, gets useful answers, navigates easily.

**Current Status**: ✅ Feature-complete MVP ready for testing

## Core Loop (What's Built)
1. App knows: **location, time, weather, budget, preferences, history** ✅
2. Shows: **ONE contextual destination** (not 3 moves - singular recommendation) ✅
3. User can: **navigate with transit, ask questions, log expenses** ✅
4. AI is: **specific, actionable, budget-aware, contextual** ✅

## Complete Feature Set

### ✅ AI Destination Generation
- Claude generates one perfect destination based on full context
- Factors: location, time, weather, budget remaining, walking done today, preferences, visit history
- "Something else" excludes destinations for the day
- Works in **any city globally** (not Tokyo-specific)
- Uses Google Places API to enrich with real data (photos, hours, ratings)

### ✅ Smart Navigation
- Transit directions with real train/bus lines via Google Routes API
- Step-by-step instructions with duration and distance
- Interactive map with route polyline overlay
- Arrival detection (50m geofence triggers companion mode)
- Works globally wherever Google Routes has data

### ✅ Last Train Warnings (THE MOAT)
- Extracts actual last train times from Google Routes API
- **Proactive warnings at 90 min (info), 60 min (warning), 30 min (urgent)**
- Prevents getting stranded late at night
- Calculates time remaining and offers "get directions home"
- **This is the killer feature** - expensive to build, extremely valuable

### ✅ Companion Mode
- Area-aware chat when user arrives at destination
- Claude has full context (location, time, destination, conversation history)
- Quick actions: Scan (camera placeholder), Add Expense, Explore Nearby
- "I'm done here" records visit and returns to home

### ✅ Budget Tracking
- Set trip budget and duration in settings
- Automatic daily budget calculation
- Add expense modal with categories (Food, Transport, Shopping, Activity, Other)
- Real-time budget bar on home screen
- Tracks spending by day
- Soft limits (Claude suggests going over if experience is worth it)

### ✅ Settings & Preferences
- **Home base** - For last train warnings and "take me home"
- **Trip budget** - Total budget and trip duration
- **Budget level** - Budget/Moderate/Luxury (affects AI suggestions)
- **Walking tolerance** - Low/Medium/High (affects distance suggestions)
- **Dietary restrictions** - Vegetarian, vegan, gluten-free, halal, kosher
- **Interests** - Food, culture, nightlife, nature, shopping, iconic
- **Avoid crowds** - Preference for less touristy spots
- All preferences persist via AsyncStorage

## Screens (All Built)

1. **Home Screen** ✅
   - AI-generated destination card with "See more" and "Take me there"
   - Budget bar showing daily allocation and spending
   - Quick actions (Camera, Add Expense, Stamps)
   - Chat input (placeholder - not wired to anything yet)
   - Settings button in header
   - Setup warnings if API keys missing

2. **Destination Detail Screen** ✅
   - Hero image, title, rating, price level, category
   - Open/closed status badge
   - "Why now" explanation (highlighted)
   - "What it is" full description
   - "When to go" timing advice
   - Transit preview with icon
   - Estimated cost
   - Full hours
   - "Spots you might like" with details
   - "Something else" and "Take me there" actions

3. **Navigation Screen** ✅
   - Interactive map with route polyline and markers
   - Step-by-step transit instructions
   - Real-time location tracking
   - Urgent warning banner for last train alerts
   - Back button to return

4. **Companion Mode Screen** ✅
   - Area-aware chat with Claude
   - Initial greeting with destination context
   - Message history with user/assistant bubbles
   - Quick actions: Scan, Expense, Explore Nearby
   - "I'm done here" button to complete visit

5. **Settings Screen** ✅
   - Home base configuration
   - Budget setup with daily preview
   - Walking tolerance selection
   - Dietary restrictions (multi-select)
   - Interests (multi-select)
   - Avoid crowds toggle
   - Form validation and persistence

6. **Add Expense Modal** ✅
   - Amount input with ¥ symbol
   - Category selection grid with emojis
   - Optional note field
   - Integrates with BudgetStore
   - Available from home screen and companion mode

## What's NOT Built Yet

### 🔲 Stamp Books / Passport System (NICE TO HAVE)
**Vision**: Country-based milestone tracking with photo uploads

**Proposed Structure**:
- **Country-based** stamp books (not city-based):
  - Thailand Essentials (20 milestones)
  - Japan Essentials (20 milestones)
  - Each country has curated "can't miss" experiences
  - Optional city sub-sections (Bangkok, Phuket, Chiang Mai within Thailand)

**Features**:
- Browse stamp books for different countries
- Track completed milestones
- Upload photos for each completed stamp
- View history of all completed stamp books
- Progress indicators (5/20 complete, etc.)
- Celebratory animations when completing a book

**Why Country vs. City**:
- Easier to curate (20 Thailand essentials vs. 20 per city)
- Encourages multi-city exploration within one trip
- Less overwhelming for users
- Can still have city-specific milestones within country book

### 🔲 Chat Functionality
- Chat input exists on home screen but not wired
- Should work like companion mode but without needing to be at a destination
- Ask general questions, get recommendations, translate things
- Remembers conversation context

### 🔲 Camera / Vision Integration
- Scan menus, signs, receipts
- Claude analyzes image and gives actionable advice
- "This is a menu. The tonkotsu ramen is ¥980. I recommend it."
- Button exists but placeholder only

### 🔲 Onboarding Flow
- First-time setup wizard
- Guides through settings configuration
- Explains key features (last train warnings, budget tracking)
- Could be as simple as showing settings on first launch

### 🔲 Walking Directions Fallback
- When transit not available, show walking directions
- Currently shows alert but doesn't provide walking route
- Google Routes API supports this, just needs implementation

### 🔲 Animations & Polish
- Micro-interactions on button presses
- Smooth transitions between screens
- Loading skeletons instead of text
- Haptic feedback

## Tech Stack (What's Used)

- **React Native** + Expo + TypeScript
- **Expo Router** for file-based routing
- **Zustand** for state management (7 stores)
- **AsyncStorage** for persistence (settings, budget, visits)
- **Claude API** (REST, not SDK for RN compatibility)
  - Model: claude-sonnet-4-20250514
  - Destination generation + chat
- **Google Places API (New)** for place data enrichment
- **Google Routes API v2** for transit directions and last train times
- **OpenWeatherMap** for real-time weather (optional, falls back to mock)
- **react-native-maps** for map visualization
- **expo-location** for location tracking
- **Lucide React Native** for icons (no emojis in UI)

## Architecture

### State Management (Zustand Stores)
1. **useDestinationsStore** - Current destination, loading, excluded IDs
2. **useNavigationStore** - Navigation state machine (idle → viewing → navigating → companion)
3. **useWarningsStore** - Proactive alerts (last train, closing times, weather)
4. **useBudgetStore** - Trip budget, daily budget, expenses, computed getters
5. **usePreferencesStore** - User preferences, home base, interests, dietary
6. **useTripStore** - Visit history, walking minutes, completed destinations
7. **useStampsStore** - Stamp completion tracking (not wired yet)
8. **useLocationStore** - Coordinates, neighborhood, address
9. **useWeatherStore** - Condition, temperature, description

### Services (External APIs)
- **claude.ts** - AI destination generation and chat
- **places.ts** - Google Places enrichment (searchPlace, searchNearby, getPlaceDetails)
- **routes.ts** - Transit directions (getTransitDirections, getWalkingDirections, getMinutesUntilLastTrain)
- **weather.ts** - OpenWeatherMap integration

### Hooks (Orchestration)
- **useDestinationGeneration** - Builds full context, calls Claude, handles auto-generation
- **useLocation** - Location tracking with permissions
- **useWeather** - Weather fetching with fallback to mock
- **useTimeOfDay** - Returns morning/afternoon/evening/night based on hour

### Key Files
- **types/index.ts** - All TypeScript interfaces (Destination, TransitRoute, Visit, Expense, etc.)
- **constants/theme.ts** - Design system (colors, typography, spacing, shadows)
- **constants/config.ts** - API keys and feature flags
- **utils/setupCheck.ts** - API key validation
- **utils/polyline.ts** - Google Maps polyline decoder

## Location Compatibility

**The app works globally, not just Tokyo:**
- Claude can generate destinations for any location (just needs coordinates)
- Google Places/Routes have global coverage
- Weather API works worldwide
- All location logic is coordinate-based, not city-hardcoded

**To use in a new city:**
1. Just open the app in that city
2. Location automatically updates
3. Claude generates destinations for current location
4. Works in Bangkok, Phuket, Chiang Mai, Osaka, Kyoto, anywhere with Google Maps data

**Minor Tokyo references to update:**
- Claude prompt mentions "Tokyo" - should be dynamic based on city
- Mock data uses Tokyo neighborhoods - not a blocker for testing

## The Moat (Why This is Hard to Replicate)

**Last Train Warnings** are the differentiator:
1. Requires parsing Google Routes API transit details
2. Extracting departure times from localizedValues
3. Parsing time strings ("11:47 PM") to Date objects
4. Calculating time remaining in real-time
5. Creating proactive warnings at specific thresholds
6. Offering contextual "get directions home"

**Why this matters:**
- Every travel app shows how to get places
- None tell you when you need to leave to get home
- Prevents expensive taxis or getting stranded
- Extremely valuable, expensive to build correctly

## Design Principles

- **Premium aesthetic** - Airbnb/Uber quality level
- **Contextual, not generic** - Every suggestion is specific to right now
- **One confident recommendation** - Not 10 options to choose from
- **Proactive, not reactive** - Warnings before problems happen
- **Companion, not checklist** - Organic discovery over rigid itineraries
- **Dark text on light backgrounds** - Easy to read in sunlight
- **No emojis in UI** - Professional, clean design
- **Lucide icons only** - Consistent, premium look

## Testing & Deployment

**Current Status**: Ready for real-world testing

**Setup Required**:
1. Configure API keys in `.env`:
   - `EXPO_PUBLIC_CLAUDE_API_KEY` (required)
   - `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` (required)
   - `EXPO_PUBLIC_WEATHER_API_KEY` (optional)

2. Enable Google APIs:
   - Places API (New)
   - Routes API
   - Maps SDK

3. Run: `npx expo start`

**See TESTING.md for complete guide**

## Context Preservation for Compaction

When chat compacts and you need to continue:

**Essential Context (DON'T LOSE THIS)**:
1. **App works globally** - Not Tokyo-specific despite initial vision
2. **Stamp books should be country-based** - Thailand, Japan, etc. with optional city sub-sections
3. **Last train warnings are THE MOAT** - The killer feature that's expensive to replicate
4. **Single destination architecture** - NOT 3 moves, ONE confident recommendation
5. **All core features are complete** - Chat, navigation, budget tracking, settings all work
6. **Stamps are the only major missing feature** - Everything else is nice-to-have polish

**Current Architecture Summary**:
- 9 Zustand stores (all complete except Stamps not wired)
- 3 service files (claude, places, routes)
- 6 screens (all built)
- Navigation state machine: idle → viewing_detail → navigating → companion_mode
- Budget tracking: set trip budget → calculate daily → log expenses → update bar

**API Structure**:
- Claude: POST to /v1/messages with context object (location, time, weather, budget, preferences, history)
- Google Places: searchPlace, searchNearby, getPlaceDetails for enrichment
- Google Routes: computeRoutes with TRANSIT mode, extract lastTrain from transitDetails

**Next Priority if Building Stamps**:
1. Create stamp book data structure (country → cities → milestones)
2. Build stamps screen UI (list of countries, tap to see milestones)
3. Add photo upload for each completed milestone
4. Show completion history and progress
5. Wire to useStampsStore (already exists but empty)

**If Continuing from Compacted Chat**:
- Reference this CLAUDE.md first
- Check README.md for complete project overview
- Check TESTING.md for testing instructions
- All code is production-ready, just need to add stamp books if desired
