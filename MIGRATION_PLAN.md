# Migration Plan: Chat-First Architecture

**Goal:** Transform Tomo from destination-card-first to chat-first revolutionary travel companion.

**Status:** Ready to begin Phase 1

**Last Updated:** December 10, 2024

---

## Phase Progress Tracker

### ✅ Phase 0: Documentation & Planning (COMPLETE)
- ✅ Updated CLAUDE.md with complete vision
- ✅ Created WHISPER_BACKEND.md setup guide
- ✅ Created MIGRATION_PLAN.md (this file)
- ✅ Committed all docs to git

**Next:** Phase 1 - Whisper Backend Setup

---

### ⏸️ Phase 1: Whisper Backend Setup (NOT STARTED)

**Estimated Time:** 2 hours

**Goal:** Get voice transcription working with Whisper API

**Tasks:**
- [ ] Create `tomo-whisper-backend/` repo
- [ ] Implement `/transcribe` endpoint with Express + Multer
- [ ] Deploy to Railway
- [ ] Set OPENAI_API_KEY environment variable
- [ ] Get Railway deployment URL
- [ ] Add EXPO_PUBLIC_WHISPER_BACKEND_URL to `.env`
- [ ] Update `services/voice.ts` with fetch implementation
- [ ] Test end-to-end: Record → Transcribe → Chat

**Files to Create:**
- `../tomo-whisper-backend/server.js`
- `../tomo-whisper-backend/package.json`

**Files to Modify:**
- `services/voice.ts` (replace placeholder with real transcription)
- `.env` (add WHISPER_BACKEND_URL)

**Success Criteria:**
- [ ] Voice button records audio
- [ ] Audio transcribes via backend within 3 seconds
- [ ] Transcribed text appears as message in chat
- [ ] Zero errors in Railway logs

**Blockers:** None

**Notes:**
- See WHISPER_BACKEND.md for detailed setup
- Use Railway free tier (500 hours/month)
- Cost: ~$0.006 per minute of audio (negligible)

---

### ⏸️ Phase 2: Chat-First UI Redesign (NOT STARTED)

**Estimated Time:** 4-5 hours

**Goal:** Make chat the default screen with inline place cards and maps

**Tasks:**
- [ ] Remove destination card generation on app load
- [ ] Add Tomo greeting message on first open
- [ ] Create `components/PlaceCard.tsx` (inline in messages)
- [ ] Create `components/InlineMap.tsx` (small MapView in messages)
- [ ] Create `components/ActionButtons.tsx` (button array)
- [ ] Update MessageBubble to render inline components
- [ ] Update Claude prompt for structured JSON responses
- [ ] Parse Claude responses for placeCard + inlineMap
- [ ] Handle action button presses (navigate, regenerate, etc.)
- [ ] Test: Ask for food → Get place card → Tap "Take me there"

**Files to Create:**
- `components/PlaceCard.tsx`
- `components/InlineMap.tsx`
- `components/ActionButtons.tsx`
- `components/MessageBubble.tsx` (if not exists, otherwise modify)

**Files to Modify:**
- `app/index.tsx` (major redesign - remove destination cards, chat-first)
- `services/claude.ts` (add structured response parsing)
- `types/index.ts` (add placeCard, inlineMap to ChatMessage interface)

**Success Criteria:**
- [ ] App opens to full-screen chat (not destination cards)
- [ ] Tomo greets with location-aware message
- [ ] User asks "I'm hungry"
- [ ] Claude responds with inline place card + mini map
- [ ] Action buttons work (Take me there, Something else)
- [ ] Place card shows photo, rating, price, distance
- [ ] Mini map shows location pin
- [ ] Tapping "Take me there" navigates to navigation screen

**Blockers:** None (Phase 1 doesn't block this)

**Notes:**
- Keep destination generation logic (just don't auto-call on load)
- Inline map should be small (200px height), tappable to expand
- Place card design should match iMessage aesthetic

---

### ⏸️ Phase 3: Navigation Polish (NOT STARTED)

**Estimated Time:** 2-3 hours

**Goal:** Smooth transitions between chat and navigation modes

**Tasks:**
- [ ] Test "Take me there" → navigation screen transition
- [ ] Ensure chat bar at bottom of navigation screen works
- [ ] Add voice input to navigation chat bar
- [ ] Add camera input to navigation chat bar
- [ ] Test arrival detection → return to chat
- [ ] Add transition animations (optional but nice)
- [ ] Test full flow: Chat → Navigate → Arrive → Place mode
- [ ] Ensure messages persist across mode changes

**Files to Modify:**
- `app/navigation.tsx` (minor polish, ensure voice/camera work)
- `app/index.tsx` (handle navigation trigger smoothly)

**Success Criteria:**
- [ ] Transition from chat to navigation feels smooth
- [ ] Chat bar at bottom of navigation screen works
- [ ] Can ask questions while navigating ("Is this the right street?")
- [ ] Voice button works in navigation mode
- [ ] Camera button works in navigation mode
- [ ] Arrival detection switches back to chat with place context
- [ ] No abrupt screen changes or jarring transitions

**Blockers:** Requires Phase 2 (chat-first UI)

**Notes:**
- Navigation screen already has map + chat structure
- Just need to polish and ensure all inputs work

---

### ⏸️ Phase 4: Trip Recap (NOT STARTED)

**Estimated Time:** 4-5 hours

**Goal:** Beautiful shareable trip summaries (the growth mechanism)

**Tasks:**
- [ ] Create `app/recap.tsx` screen
- [ ] Map with all visit pins (react-native-maps)
- [ ] Color code pins by city
- [ ] Timeline breakdown (by city/day)
- [ ] Stats visualization (places, spending, photos)
- [ ] Create `services/tripRecap.ts`
- [ ] Implement `generateRecapData()` function
- [ ] Implement `exportToPDF()` function (optional for MVP)
- [ ] Implement `generateShareableLink()` function
- [ ] Implement `generateIGStory()` function
- [ ] Add "Show me my trip" trigger in chat
- [ ] Test: Ask "show me my trip" → Recap appears

**Files to Create:**
- `app/recap.tsx`
- `services/tripRecap.ts`

**Files to Modify:**
- `app/index.tsx` (add trigger for "show me my trip")
- `services/claude.ts` (detect when user asks for recap)
- `stores/useTripStore.ts` (enhance if needed)

**Success Criteria:**
- [ ] User can say "show me my trip" in chat
- [ ] Recap screen appears with beautiful map
- [ ] All visited places shown as pins
- [ ] Pins color-coded by city
- [ ] Stats show: X cities, Y places, Z spent
- [ ] Timeline shows breakdown by day/city
- [ ] Export options available (PDF, Share link, IG story)
- [ ] Shareable link works (public view)
- [ ] IG story template looks postable

**Blockers:** None (can work in parallel with other phases)

**Notes:**
- This is THE growth feature - must look beautiful
- Focus on shareability (Strava for travel)
- Public links should not include conversation history (privacy)

---

### ⏸️ Phase 5: Multi-City Intelligence (NOT STARTED)

**Estimated Time:** 2-3 hours

**Goal:** Automatic city change detection with trip summaries

**Tasks:**
- [ ] Enhance `stores/useTripStore.ts` with cities array
- [ ] Add `currentCity` tracking
- [ ] Implement `detectCityChange()` logic
- [ ] Add location change watcher in app/index.tsx
- [ ] When city changes: Add system message to chat
- [ ] When city changes: Tomo responds with mini-recap + question
- [ ] Prompt user to set new home base
- [ ] Update Trip interface with cities array
- [ ] Test: Change location → City detection → Prompt

**Files to Modify:**
- `stores/useTripStore.ts` (add cities tracking)
- `app/index.tsx` (watch for city changes)
- `types/index.ts` (update Trip interface)
- `services/claude.ts` (city change prompts)

**Success Criteria:**
- [ ] App detects when user moves to new city
- [ ] System message appears: "You're now in Chiang Mai!"
- [ ] Tomo responds: "How was Bangkok? Your summary: ..."
- [ ] Tomo asks: "Want to set new home base?"
- [ ] User can set new home base per city
- [ ] Last train warnings work relative to current city's home
- [ ] Trip recap shows multi-city breakdown

**Blockers:** None

**Notes:**
- City detection threshold: ~50km distance
- Use reverse geocoding to get city name
- Don't trigger on small movements within city

---

### ⏸️ Phase 6: Polish & Testing (NOT STARTED)

**Estimated Time:** 2-3 hours

**Goal:** Production-ready quality, zero errors

**Tasks:**
- [ ] Add loading states for all async operations
- [ ] Add error handling (no internet, API failures)
- [ ] Add empty states (no messages, no trips)
- [ ] Test complete user flows end-to-end
- [ ] Flow 1: Find food → Navigate → Arrive → Log expense
- [ ] Flow 2: Multi-day trip → City change → Recap
- [ ] Flow 3: Voice input → Camera → Translation
- [ ] Flow 4: Memory works across conversations
- [ ] Add smooth transitions between modes
- [ ] Add loading skeletons (optional)
- [ ] Performance: Debounce location updates
- [ ] Performance: Image compression
- [ ] Performance: Message list virtualization (if needed)
- [ ] Run TypeScript checks (`npx tsc --noEmit`)
- [ ] Fix all TS errors
- [ ] Test on real device in Thailand

**Files to Modify:**
- All screens (add loading/error states)
- All services (add error handling)

**Success Criteria:**
- [ ] Zero TypeScript errors
- [ ] Zero runtime crashes
- [ ] All user flows work end-to-end
- [ ] Loading states prevent user confusion
- [ ] Error messages are helpful
- [ ] App feels polished and professional
- [ ] Performance is smooth (no lag)
- [ ] Real device testing successful

**Blockers:** Requires all other phases complete

**Notes:**
- This is the final pass before launch
- Focus on edge cases and error scenarios
- Test with poor internet connection
- Test with GPS off → on

---

## Overall Progress

**Phases Complete:** 0 / 6
**Estimated Total Time:** 15-20 hours
**Status:** Ready to begin

---

## Critical Path

**Must complete in order:**
1. Phase 1 (Whisper) - Essential for voice experience
2. Phase 2 (Chat UI) - Core architecture change
3. Phase 3 (Navigation) - Depends on Phase 2
4. Phase 6 (Polish) - Final step

**Can work in parallel:**
- Phase 4 (Trip Recap) - Independent feature
- Phase 5 (Multi-City) - Independent feature

**Recommended order for solo developer:**
1. Phase 1: Whisper Backend (2h)
2. Phase 2: Chat-First UI (4-5h)
3. Phase 3: Navigation Polish (2-3h)
4. Phase 4: Trip Recap (4-5h)
5. Phase 5: Multi-City (2-3h)
6. Phase 6: Polish & Test (2-3h)

---

## How to Use This File

**At start of each session:**
1. Read current phase status
2. Check what's completed
3. See what's next
4. Review blockers

**During development:**
1. Update task checkboxes as you complete them
2. Add notes about decisions or issues
3. Update blockers if stuck

**End of session:**
1. Mark phase as complete when all tasks done
2. Update "Last Updated" date
3. Commit changes to git
4. Next session picks up from here

---

## Rollback Plan

If something goes wrong:

```bash
# See git history
git log --oneline

# Rollback to before chat-first redesign
git checkout <commit-hash-before-phase-2>

# Create new branch to preserve work
git checkout -b chat-first-attempt-1

# Return to main
git checkout main
```

All work is safe in git history. We can always revert.

---

## Notes & Decisions

### Design Decisions
- Chat-first, not destination-first
- Inline place cards and maps (not separate screens)
- Navigation mode = map (70%) + chat (30%)
- Voice transcription via backend (not on-device)
- Trip recap = Strava for travel (growth mechanism)

### Technical Decisions
- Keep all existing stores (memory, conversation, trip, etc.)
- Keep navigation screen structure (just polish it)
- Use Railway for backend (free tier sufficient)
- Use Google Places + Routes APIs (already integrated)
- React Native Maps for all map rendering

### Trade-offs
- **Backend dependency** - Required for Whisper, worth it for quality
- **Inline maps** - Small size (200px) but tappable to expand
- **Mode transitions** - Smooth but not over-animated
- **Trip recap** - Focus on shareability over complexity

---

## Success Metrics (Post-Launch)

**Phase 1-6 complete when:**
- [ ] App opens to chat with location-aware greeting
- [ ] Voice button transcribes speech accurately
- [ ] Inline place cards appear when asking for places
- [ ] "Take me there" starts navigation smoothly
- [ ] Can chat while navigating
- [ ] Arrival detection works
- [ ] "Show me my trip" generates beautiful recap
- [ ] Trip recap is shareable on social
- [ ] Multi-city trips tracked automatically
- [ ] Zero TypeScript errors
- [ ] Zero crashes on real device

**Then we're ready to ship.**

---

**Last Updated:** December 10, 2024
**Current Phase:** Phase 0 complete, Phase 1 ready to start
**Blockers:** None
