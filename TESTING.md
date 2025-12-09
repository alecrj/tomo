# Tomo Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Then add your API keys to `.env`:

```env
# Required - Claude API Key (get from https://console.anthropic.com/)
EXPO_PUBLIC_CLAUDE_API_KEY=sk-ant-...

# Required - Google Places & Routes API Key (get from https://console.cloud.google.com/)
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...

# Optional - OpenWeatherMap API Key (get from https://openweathermap.org/api)
EXPO_PUBLIC_WEATHER_API_KEY=...
```

### 3. Enable Google APIs

In Google Cloud Console, enable these APIs:
- Places API (New)
- Routes API
- Maps SDK (for map display)

### 4. Run the App

```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on physical device (scan QR code with Expo Go app)
```

## What to Test

### Core Flow
1. **Open app** → Should see AI-generated destination for current time/weather
2. **Tap "See more"** → View full destination details with photos, hours, spots
3. **Tap "Take me there"** → Get transit directions with map
4. **Last train warnings** → Should appear if trip includes trains after 10pm
5. **Arrive at destination** → Companion mode activates (simulated within 50m)
6. **Chat with AI** → Ask questions about the area
7. **Log expenses** → Add expense via quick actions
8. **Return home** → Exit companion mode, see new destination

### Settings
- Tap gear icon in header
- Set home base (for last train warnings)
- Configure trip budget
- Set dietary restrictions and interests
- Verify preferences affect AI suggestions

### Budget Tracking
- Check budget bar shows daily allocation
- Add expenses via quick actions
- Verify budget bar updates in real-time
- Check spending doesn't exceed daily budget

## Testing Tips

### Mock Data
If you don't have API keys yet:
- Weather will use mock data (see `useMockWeather` in config.ts)
- Location requires actual device/simulator permissions
- Claude API is required for destination generation

### Location Testing
- **iOS Simulator**: Debug → Location → Custom Location
- **Android Emulator**: Extended controls → Location
- **Use Tokyo coordinates** for best results: 35.6762° N, 139.6503° E (Shibuya)

### Testing Last Train Warnings
- Warnings trigger when route includes trains
- 90 min = info, 60 min = warning, 30 min = urgent
- Test by simulating late-night travel (after 10pm JST)

### Common Issues

**"Claude API Key Missing" warning**
- Check .env file exists and has EXPO_PUBLIC_CLAUDE_API_KEY
- Restart dev server after adding keys

**No destination generated**
- Check console for API errors
- Verify Claude API key is valid
- Check network connectivity

**Map not showing**
- Verify Google Places API key is valid
- Check that Places API (New) is enabled in Google Cloud Console
- Check console for API errors

**Location not working**
- Grant location permissions when prompted
- Check device/simulator location settings
- Verify location services are enabled

## Debug Logs

Key console messages to watch:
- `"Generating destination with context:"` - AI generation starting
- `"Destination generated:"` - AI generation successful
- `"Fetching transit directions..."` - Navigation starting
- `"Route found, navigating..."` - Navigation ready
- `"Last train in X minutes"` - Warning triggered

## Success Criteria

The app is working correctly if:
1. ✅ Destinations generate automatically on load
2. ✅ Destinations are contextual (time-appropriate, weather-aware)
3. ✅ Transit directions show real routes with line names
4. ✅ Maps display correctly with polylines
5. ✅ Budget bar updates when expenses are logged
6. ✅ Settings persist between app restarts
7. ✅ Last train warnings appear when applicable

## Troubleshooting

### "Authentication failed" errors
- Verify API keys are correct
- Check API quotas haven't been exceeded
- Verify billing is enabled (Google Cloud requires billing for Places API)

### "Rate limit exceeded"
- Claude: 50 requests/min on most plans
- Google Places: Check your quota in Cloud Console
- Wait a minute and try again

### App crashes or freezes
- Check console for errors
- Restart development server
- Clear app cache: Settings → Clear all data

## Reporting Issues

When reporting issues, include:
1. Device/simulator and OS version
2. Steps to reproduce
3. Console error messages
4. Screenshots if applicable
5. Whether API keys are configured
