# Tomo - State Before Compaction

## 🎯 THE VISION
Tomo = AI travel companion that replaces Google Maps + ChatGPT + travel guides
- Open app → ONE perfect destination RIGHT NOW
- Context-aware (time, weather, budget, energy, location)
- Transit navigation with LAST TRAIN WARNINGS (THE MOAT)
- Camera scanning for menus/signs
- Companion mode chat when you arrive
- Stamp books for countries (Thailand, Japan, etc.)

## ✅ WHAT'S WORKING (Testable in Expo Go)
- Real GPS location (expo-location works!)
- Claude AI generates destinations based on real location
- Google Places API enrichment (photos, ratings, hours)
- Chat with Claude (context-aware)
- Budget tracking
- Settings screen
- Add expense modal
- "Something else" button (exclusion + regeneration)
- All stores persisted with AsyncStorage

## ❌ WHAT'S DISABLED (Needs Native Build)
- Maps visualization (react-native-maps removed for Expo Go)
- Camera scanning
- Last train warnings (needs transit data from maps)
- Animated backgrounds (caused crashes, temporarily removed)

## 🐛 BUGS FIXED
- ✅ Infinite loops in useLocation, useWeather, useDestinationGeneration
- ✅ React version mismatch (downgraded to 19.1.0)
- ✅ API keys stored in EAS environment variables
- ✅ Bundle identifier changed to com.alecrodriguez.tomo

## 📂 PROJECT STRUCTURE
```
/tomo
├── app/ - Expo Router screens
│   ├── index.tsx - Home screen
│   ├── destination.tsx - Destination detail
│   ├── navigation.tsx - Navigation (disabled for Expo Go)
│   ├── companion.tsx - Companion mode chat
│   └── settings.tsx - Settings
├── components/ - Reusable UI components
├── services/ - API integrations (claude, places, routes, weather, location)
├── stores/ - Zustand stores (destinations, navigation, budget, preferences, trip, stamps, location, weather)
├── hooks/ - Custom hooks
├── types/ - TypeScript types
└── constants/ - Theme, config
```

## 🔑 API KEYS (in EAS environment)
- EXPO_PUBLIC_CLAUDE_API_KEY
- EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
- EXPO_PUBLIC_WEATHER_API_KEY

## 🚀 NEXT STEPS (When Resuming)

### Immediate (In Expo Go):
1. Add photos to destination cards
2. Show rating, distance, travel time on cards
3. Polish destination detail screen
4. Test with real GPS in Bangkok
5. Validate Claude generates good Thai destinations

### Later (Native Build):
1. Add react-native-maps back
2. Build with `eas build --profile preview --platform ios`
3. Test maps + navigation in real world
4. Add camera scanning
5. Add last train warnings
6. Build stamp books feature

## 🧪 TO TEST IN EXPO GO
```bash
npx expo start
```
- Scan QR with Expo Go app
- Grant location permission
- Wait for destination to generate (15-30 sec)
- Test "Something else" button
- Test chat
- Test settings

## 📝 IMPORTANT FILES
- `/Users/alec/Desktop/tomo/CLAUDE.md` - Full project vision
- `/Users/alec/Desktop/tomo/README.md` - Project overview
- `/Users/alec/Desktop/tomo/TESTING.md` - Testing guide
- This file - Quick state summary
