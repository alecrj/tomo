# Tomo — AI Travel Companion for Tokyo

## Vision
Replace Google Maps + ChatGPT + travel guides with one app. User opens Tomo, sees what to do right now, asks questions, gets useful answers, navigates easily.

## Core Loop
1. App knows: location, time, weather, budget, preferences, history
2. Shows: 3 contextual "Moves" (micro-itineraries)
3. User can: start a move, ask questions, scan signs/menus, track expenses
4. AI is: specific, actionable, budget-aware, remembers context

## Screens
1. **Main** — Header, budget bar, 3 move cards, quick actions, chat input
2. **Chat Sheet** — Expands from bottom, full conversation, camera access
3. **Stamps** — "Tokyo Essentials" checklist, 15-20 must-do experiences
4. **Settings** — Preferences, home base, budget setup, dietary restrictions
5. **Add Expense Modal** — Quick expense logging

## What Makes It Useful
- **Moves** factor in: time of day, weather, budget remaining, walking done today, places already visited
- **Transit directions** include: line names, platform, direction, exit number, landmarks
- **Chat** remembers context: "how do I get there" knows what "there" means
- **Vision** gives actionable help: not just translation, but what to do about it
- **Budget** is smart: soft limits, can suggest going over if worth it

## Tech Stack
- Expo + TypeScript + Expo Router
- Zustand for state
- Claude API for AI
- Google Places API for nearby data
- OpenWeatherMap for weather
- Lucide icons (no emojis)

## Design Principles
- Premium aesthetic (Airbnb/Uber level)
- No scrolling on main screen
- Animated gradient backgrounds
- One card expanded at a time
- Dark text on light backgrounds, white on dark

## Current Build Status
- [x] Project setup + types
- [x] Design system
- [x] Animated background
- [x] Main screen layout
- [x] Zustand stores
- [x] Location service
- [x] Weather service
- [ ] Claude integration
- [ ] Chat functionality
- [ ] Camera + vision
- [x] Budget tracking
- [ ] Stamps screen
- [ ] Settings screen
- [ ] Polish + animations

## Thinking Guidelines
- Use "think" for simple component fixes
- Use "think hard" for service architecture
- Use "ultrathink" for system-wide decisions (navigation flow, state management)
- Continue until task complete without stopping between steps
