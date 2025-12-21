# Session 20: The Conversation-First Redesign

**Date:** December 20, 2024
**Status:** Planning Phase

---

## The Mental Model (Lock This In)

**The Home screen is a conversation waiting to happen.**

Not a dashboard. Not a feed. Not a list of suggestions.

It should feel like:

> Opening a text thread with a smart local friend who already knows where you are.

If you remember nothing else, remember that.

---

## Core Principles

### 1. Home IS Chat

When you open Tomo:
- You see a **conversation**
- Even if it's empty, it *reads* as a chat
- The input is the most important element

The Home screen is not "before chat."
**Home IS chat.**

### 2. It Starts Quiet, Not Helpful

On first open, nothing is shouting at you.

At the top: calm context (location, time, weather)

Below that: **"Ask me anything"**

That's it. No:
- "Popular near you"
- "Right now"
- "Recommended for tonight"
- Tips, cards, or lists

The app is waiting for *you*. This reduces stress. It feels respectful.

### 3. Chips Are Just Pre-Written Messages

Under "Ask me anything" are a few chips: Food, Explore, Chill, Ride

Important:
- Chips are just **shortcuts to typing**
- Tapping one is the same as typing that message
- They don't change the screen or mode
- They don't filter content

### 4. The Input Bar Is the Star

At the bottom:
- Text input (always visible)
- Mic icon
- Camera icon

Text is primary. Voice and camera are optional.

### 5. Every Answer Is a Reply

When the user types something, the screen shows:
- The user's message
- Tomo's response underneath

**The user must always see their own message.** It anchors the experience as a conversation.

### 6. Recommendations Are Replies, Not Content

Tomo responds with:
- A short sentence explaining the thinking
- Then **2–3 options max**

Not 10. Not a list. Not a feed.

### 7. Options Start Collapsed

Each option shows minimal info:
- Name
- Distance
- Price level
- Open/closed status

The user can tap **one** to expand.

### 8. One Expanded at a Time

When one option is expanded, it shows:
- Photos (carousel)
- Rating + review count
- A short, human explanation (why this place)
- Clear actions: Take me there, Save

Only one option expanded at a time. This feels like: "Tell me more about this one."

### 9. Refinement Happens Naturally

Under the options:
- Refresh (show different options)
- Ask something else

If user wants something different, they just type it. No filters. No toggles. Language is the interface.

---

## One Sentence Summary

> **"Home is a quiet chat screen that waits for the user, then helps them decide—one thing at a time."**

---

## What Home NEVER Does

- Show recommendations before a question
- Feel like it's guessing what you want
- Dump content "just in case"
- Force voice
- Show more than 3 options
- Mix browsing and chatting

---

## Visual Architecture

### Empty State (App Opens)
```
┌─────────────────────────────────────────┐
│         Chiang Mai · Old City           │
│      29°C · Night · Light rain          │
│                                          │
│                                          │
│                                          │
│          Ask me anything                 │
│                                          │
│   [Food]  [Explore]  [Chill]  [Ride]    │
│                                          │
│                                          │
│                                          │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │ Ask Tomo...              🎤  📷 │    │
│  └─────────────────────────────────┘    │
│                                          │
│  [Home]  [Map]  [Chat]  [Saved]  [You]  │
└─────────────────────────────────────────┘
```

### After User Asks Something
```
┌─────────────────────────────────────────┐
│         Chiang Mai · Old City           │
│      29°C · Night · Light rain          │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │ Where are some good food spots  │    │  ← User message
│  │ nearby?                         │    │
│  └─────────────────────────────────┘    │
│                                          │
│  Here are two places locals love:       │  ← Tomo intro
│                                          │
│  ┌─────────────────────────────────┐    │
│  │ 🍴 Khao Soi Khun Yai            │    │  ← EXPANDED
│  │ 4 min walk · ¥¥ · Thai · Open   │    │
│  │                                  │    │
│  │ [PHOTO] [PHOTO] [PHOTO] →       │    │
│  │                                  │    │
│  │ ★★★★☆ 4.6 (1,583 reviews)       │    │
│  │                                  │    │
│  │ Classic khao soi spot locals    │    │
│  │ swear by. Simple, busy, very    │    │
│  │ authentic.                       │    │
│  │                                  │    │
│  │ [    Take me there    ]         │    │
│  │ [Save]       [More options]     │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │ 🍴 Huen Phen                    │    │  ← COLLAPSED
│  │ 6 min walk · ¥¥ · Thai · Open   │    │
│  │ until 10pm                       │    │
│  └─────────────────────────────────┘    │
│                                          │
│  [Refresh]    [Ask something else]      │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │ Ask Tomo...              🎤  📷 │    │
│  └─────────────────────────────────┘    │
│                                          │
│  [Home]  [Map]  [Chat]  [Saved]  [You]  │
└─────────────────────────────────────────┘
```

### When User Taps Second Option
```
First option COLLAPSES:
┌─────────────────────────────────┐
│ 🍴 Khao Soi Khun Yai            │  ← Now collapsed
│ 4 min walk · ¥¥ · Thai · Open   │
└─────────────────────────────────┘

Second option EXPANDS:
┌─────────────────────────────────┐
│ 🍴 Huen Phen                    │  ← Now expanded
│ 6 min walk · ¥¥ · Thai · Open   │
│                                  │
│ [PHOTO] [PHOTO] [PHOTO] →       │
│ ★★★★☆ 4.5 (892 reviews)         │
│ Traditional northern Thai...    │
│ [Take me there] [Save]          │
└─────────────────────────────────┘
```

---

## Current Problems to Fix

### Critical (App Broken)
1. **"Tomo is unable to respond"** - Model names wrong (gpt-5-mini returns 400)
2. **Keyboard blocks input** - Can't see what you're typing
3. **Memory extraction broken** - Spamming 400 errors

### Architecture (Wrong Model)
4. **Home and Chat are separate** - Should be one screen
5. **Proactive recommendations** - Should start empty
6. **PlaceCards don't collapse/expand** - Need this interaction

### Data Issues
7. **No photos in PlaceCards** - Places API missing photos field
8. **No review count** - Need userRatingCount from API

### Voice Issues
9. **Speaks Thai first** - No language in system prompt
10. **Can't take actions** - Future: add function calling

---

## Implementation Plan

### Phase 1: Fix Critical Breaks

#### 1.1 Fix Model Names
All `gpt-5-mini` and `gpt-5.2` → `gpt-4o`

**Files:**
- `hooks/useMemoryExtraction.ts:38`
- `services/openai.ts:296, 554, 710, 907, 1026`

#### 1.2 Fix Keyboard Blocking
**File:** `app/(tabs)/index.tsx` (and chat if kept)

```typescript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
>
```

Or use `react-native-keyboard-aware-scroll-view`.

### Phase 2: Merge Home + Chat

#### 2.1 Redesign Home as Conversation
**File:** `app/(tabs)/index.tsx`

The home screen becomes:
- Empty state: Context + "Ask me anything" + chips + input
- Active state: Context + conversation messages + input

**Key changes:**
- Add message state (user messages + tomo responses)
- Chips trigger `sendMessage('food nearby')` etc.
- Responses render as conversation flow
- Remove all proactive recommendation code

#### 2.2 Update System Prompt for 2-3 Options
**File:** `services/openai.ts`

```typescript
// In buildSystemPrompt:
RESPONSE RULES:
- When recommending places, give exactly 2-3 options
- Each option needs: name, distance, price, cuisine, open status
- Include a short 1-sentence intro before the options
- Keep descriptions brief and human (why this place)
```

#### 2.3 Update Response Format
**File:** `services/openai.ts`

```typescript
// New response format:
{
  "intro": "Here are two places locals love:",
  "options": [
    {
      "name": "Khao Soi Khun Yai",
      "distance": "4 min walk",
      "priceLevel": 2,
      "cuisine": "Thai",
      "isOpen": true,
      "closingInfo": "Closes soon",
      "rating": 4.6,
      "reviewCount": 1583,
      "description": "Classic khao soi spot locals swear by. Simple, busy, very authentic.",
      "coordinates": {...},
      "photos": []  // Will be enriched from Google Places
    },
    {...}
  ],
  "actions": ["refresh", "ask_something_else"]
}
```

### Phase 3: Collapsible PlaceCard Component

#### 3.1 Create New PlaceCard with States
**File:** `components/PlaceCard.tsx`

```typescript
interface PlaceCardProps {
  place: PlaceOption;
  isExpanded: boolean;
  onToggle: () => void;
  onTakeMeThere: () => void;
  onSave: () => void;
}

function PlaceCard({ place, isExpanded, onToggle, ... }) {
  return (
    <TouchableOpacity onPress={onToggle}>
      {/* Always visible: collapsed header */}
      <View style={styles.header}>
        <Text style={styles.icon}>🍴</Text>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.meta}>
          {place.distance} · {priceSymbols} · {place.cuisine} · {openStatus}
        </Text>
      </View>

      {/* Only when expanded */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <PhotoCarousel photos={place.photos} />
          <RatingRow rating={place.rating} reviewCount={place.reviewCount} />
          <Text style={styles.description}>{place.description}</Text>
          <ActionButtons onTakeMeThere={...} onSave={...} />
        </View>
      )}
    </TouchableOpacity>
  );
}
```

#### 3.2 Manage Expanded State in Parent
**File:** `app/(tabs)/index.tsx`

```typescript
const [expandedIndex, setExpandedIndex] = useState<number>(0); // First one expanded by default

// When rendering options:
{response.options.map((option, index) => (
  <PlaceCard
    key={option.name}
    place={option}
    isExpanded={expandedIndex === index}
    onToggle={() => setExpandedIndex(index)}
    onTakeMeThere={() => navigate(option)}
    onSave={() => save(option)}
  />
))}
```

### Phase 4: Fix Photos from Google Places

#### 4.1 Update Field Mask
**File:** `services/places.ts:56`

```typescript
'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.photos'
```

#### 4.2 Enrich Response with Photos
**File:** `services/openai.ts`

After getting GPT response, for each option:
```typescript
for (const option of result.options) {
  const placeDetails = await searchPlace(option.name, context.location);
  if (placeDetails?.photos) {
    option.photos = placeDetails.photos.map(p => buildPhotoUrl(p.name, 600));
  }
  if (placeDetails?.userRatingCount) {
    option.reviewCount = placeDetails.userRatingCount;
  }
}
```

### Phase 5: Voice Language Fix

#### 5.1 Add Language Preference
**File:** `stores/usePreferencesStore.ts`

```typescript
language: 'en' | 'th' | 'ja' | 'zh' | 'ko' | 'es' | 'fr' | 'de';
// Default: 'en'
```

#### 5.2 Add to Onboarding
**File:** `app/onboarding.tsx`

New step before location permission:
- "What language should Tomo speak?"
- Grid of language options with flags

#### 5.3 Update Voice System Prompt
**Files:** `app/voice.tsx`, `services/realtime.ts`

```typescript
const language = usePreferencesStore.getState().language;
const languageMap = { en: 'English', th: 'Thai', ja: 'Japanese', ... };

instructions: `You are Tomo, a friendly AI travel companion.

CRITICAL: Always respond in ${languageMap[language]}.
Do not switch languages unless the user explicitly asks.
...`
```

### Phase 6: Cleanup

#### 6.1 Remove Separate Chat Screen?
**Decision needed:** Keep `/chat` as a route or fully merge into home tab?

Option A: Home tab IS the chat (no separate route)
Option B: Home tab is chat, but `/chat` still exists for deep links

Recommend: Option A. Simplify. The tab IS the conversation.

#### 6.2 Update CLAUDE.md
- Remove fake model names (gpt-5.2, gpt-5-mini)
- Document the conversation-first architecture
- Add design principles section

---

## File Changes Summary

| File | Change |
|------|--------|
| `hooks/useMemoryExtraction.ts` | Model → gpt-4o |
| `services/openai.ts` | Models → gpt-4o, new response format for options |
| `services/places.ts` | Add photos + userRatingCount to field mask |
| `app/(tabs)/index.tsx` | Complete rewrite as conversation screen |
| `components/PlaceCard.tsx` | Add collapsed/expanded states |
| `stores/usePreferencesStore.ts` | Add language field |
| `app/onboarding.tsx` | Add language selection step |
| `app/voice.tsx` | Add language to system prompt |
| `services/realtime.ts` | Add language to session config |
| `CLAUDE.md` | Update documentation |

---

## Testing Checklist

After implementation:

- [ ] Home opens empty with "Ask me anything" (no recommendations)
- [ ] Tapping "Food" chip sends message, shows response
- [ ] Response shows 2-3 options
- [ ] First option expanded by default
- [ ] Tapping collapsed option expands it (and collapses other)
- [ ] Expanded option shows photo carousel
- [ ] Expanded option shows rating + review count
- [ ] "Take me there" starts navigation
- [ ] "Save" saves to saved places
- [ ] Keyboard doesn't block input
- [ ] Voice speaks in selected language
- [ ] No 400 errors in logs

---

## Priority Order

1. Fix model names (stops errors)
2. Fix keyboard blocking
3. Rewrite home as conversation (the big one)
4. Create collapsible PlaceCard
5. Fix photos from Places API
6. Add language preference
7. Update documentation

---

## The Goal

When done, opening Tomo should feel like opening a chat with a smart friend who's waiting to help you—not a travel app trying to sell you something.

> **"Home is a quiet chat screen that waits for the user, then helps them decide—one thing at a time."**
