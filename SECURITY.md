# Security & Scalability Implementation Guide

This document provides detailed implementation instructions for securing Tomo before public release.

---

## Table of Contents

1. [Phase 1: Critical Security](#phase-1-critical-security)
   - [1.1 Backend API Proxy](#11-backend-api-proxy-supabase-edge-functions)
   - [1.2 Sentry Error Monitoring](#12-sentry-error-monitoring)
   - [1.3 Memory Leak Fixes](#13-memory-leak-fixes)
   - [1.4 Logger Utility](#14-logger-utility)
2. [Phase 2: Quality Gates](#phase-2-quality-gates)
   - [2.1 GitHub Actions CI/CD](#21-github-actions-cicd)
   - [2.2 Core Tests](#22-core-tests)
   - [2.3 Rate Limiting](#23-rate-limiting)
   - [2.4 Input Sanitization](#24-input-sanitization)
3. [Security Checklist](#security-checklist)
4. [Architecture Diagram](#architecture-diagram)

---

## Phase 1: Critical Security

### 1.1 Backend API Proxy (Supabase Edge Functions)

**Problem:** API keys are bundled in the app and can be extracted by anyone.

**Solution:** Move all API calls through a backend proxy that holds the keys server-side.

#### Step 1: Set up Supabase project

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize in project root
supabase init

# Login to Supabase
supabase login

# Link to your project (create one at supabase.com first)
supabase link --project-ref YOUR_PROJECT_REF
```

#### Step 2: Create Edge Functions

```bash
# Create chat function
supabase functions new chat

# Create places function
supabase functions new places

# Create routes function
supabase functions new routes
```

#### Step 3: Implement Chat Function

```typescript
// supabase/functions/chat/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

interface ChatRequest {
  messages: Array<{ role: string; content: string }>
  context?: string
  imageBase64?: string
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { messages, context, imageBase64 }: ChatRequest = await req.json()

    // Build OpenAI messages
    const openaiMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // Add image if present
    if (imageBase64) {
      openaiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: messages[messages.length - 1]?.content || 'What is this?' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: openaiMessages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

#### Step 4: Implement Places Function

```typescript
// supabase/functions/places/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const { action, ...params } = await req.json()

    let url: string
    let options: RequestInit = {
      headers: {
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'Content-Type': 'application/json',
      },
    }

    switch (action) {
      case 'nearby':
        url = 'https://places.googleapis.com/v1/places:searchNearby'
        options.method = 'POST'
        options.headers['X-Goog-FieldMask'] = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.currentOpeningHours'
        options.body = JSON.stringify({
          includedTypes: params.types,
          maxResultCount: params.maxResults || 20,
          locationRestriction: {
            circle: {
              center: { latitude: params.lat, longitude: params.lng },
              radius: params.radius || 3000,
            },
          },
        })
        break

      case 'details':
        url = `https://places.googleapis.com/v1/places/${params.placeId}`
        options.method = 'GET'
        options.headers['X-Goog-FieldMask'] = 'id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,photos,currentOpeningHours,websiteUri,nationalPhoneNumber'
        break

      case 'photo':
        url = `https://places.googleapis.com/v1/${params.photoName}/media?maxWidthPx=${params.width || 400}&key=${GOOGLE_PLACES_API_KEY}`
        const photoResponse = await fetch(url)
        return new Response(photoResponse.body, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Access-Control-Allow-Origin': '*',
          },
        })

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    const response = await fetch(url, options)
    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

#### Step 5: Deploy Functions

```bash
# Set secrets (do NOT commit these!)
supabase secrets set OPENAI_API_KEY=sk-your-key-here
supabase secrets set GOOGLE_PLACES_API_KEY=your-google-key-here

# Deploy all functions
supabase functions deploy chat
supabase functions deploy places
supabase functions deploy routes
```

#### Step 6: Update Client Services

```typescript
// services/api.ts (NEW FILE)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export async function callFunction(functionName: string, body: any) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}
```

```typescript
// services/openai.ts - UPDATE chat function
import { callFunction } from './api'

export async function chat(message: string, context: DestinationContext, history: ChatMessage[], imageBase64?: string) {
  // Instead of calling OpenAI directly:
  const response = await callFunction('chat', {
    messages: history.map(m => ({ role: m.role, content: m.content })),
    context: JSON.stringify(context),
    imageBase64,
  })

  // Process response...
}
```

#### Step 7: Remove Client-Side API Keys

Update `.env`:
```bash
# REMOVE these (move to Supabase secrets):
# EXPO_PUBLIC_OPENAI_API_KEY=sk-xxx
# EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=xxx

# ADD these:
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

### 1.2 Sentry Error Monitoring

#### Step 1: Install

```bash
npx expo install @sentry/react-native
```

#### Step 2: Configure

```typescript
// app/_layout.tsx
import * as Sentry from '@sentry/react-native'

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2, // 20% of transactions for performance
  debug: __DEV__,
})

// Wrap your root component
export default Sentry.wrap(function RootLayout() {
  // ... existing code
})
```

#### Step 3: Add Error Boundaries

```typescript
// Update ErrorBoundary in _layout.tsx
componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
  Sentry.captureException(error, { extra: errorInfo })
  console.error('[ErrorBoundary] Caught error:', error)
}
```

---

### 1.3 Memory Leak Fixes

#### Fix 1: Limit Conversation History

```typescript
// stores/useConversationStore.ts
const MAX_MESSAGES_PER_CONVERSATION = 100
const MAX_CONVERSATIONS = 50

addMessage: (message) => {
  set((state) => {
    // Limit conversations
    let conversations = state.conversations
    if (conversations.length > MAX_CONVERSATIONS) {
      conversations = conversations.slice(-MAX_CONVERSATIONS)
    }

    return {
      conversations: conversations.map((conv) =>
        conv.id === state.currentConversationId
          ? {
              ...conv,
              // Limit messages per conversation
              messages: [...conv.messages, message].slice(-MAX_MESSAGES_PER_CONVERSATION),
              lastMessageAt: Date.now(),
              messageCount: Math.min(conv.messageCount + 1, MAX_MESSAGES_PER_CONVERSATION),
            }
          : conv
      ),
    }
  })
},
```

#### Fix 2: Don't Store Base64 Images in State

```typescript
// Upload images to Supabase Storage instead
import { supabase } from './supabase'

async function uploadImage(base64: string): Promise<string> {
  const fileName = `chat-images/${Date.now()}.jpg`
  const { data, error } = await supabase.storage
    .from('images')
    .upload(fileName, decode(base64), {
      contentType: 'image/jpeg',
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(fileName)

  return publicUrl
}
```

---

### 1.4 Logger Utility

```typescript
// utils/logger.ts
import * as Sentry from '@sentry/react-native'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDev = __DEV__

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`

    if (this.isDev) {
      switch (level) {
        case 'debug':
        case 'info':
          console.log(logMessage, context || '')
          break
        case 'warn':
          console.warn(logMessage, context || '')
          break
        case 'error':
          console.error(logMessage, context || '')
          break
      }
    }

    // In production, send errors and warnings to Sentry
    if (!this.isDev && (level === 'error' || level === 'warn')) {
      Sentry.addBreadcrumb({
        message,
        level: level === 'error' ? 'error' : 'warning',
        data: context,
      })

      if (level === 'error') {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: context,
        })
      }
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context)
  }
}

export const logger = new Logger()
```

**Usage:** Replace all `console.log` with `logger.info`, `console.error` with `logger.error`, etc.

---

## Phase 2: Quality Gates

### 2.1 GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript check
        run: npx tsc --noEmit

      - name: Run ESLint
        run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build-ios:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Build iOS
        run: eas build --platform ios --profile preview --non-interactive
```

### 2.2 Core Tests

```typescript
// __tests__/services/openai.test.ts
import { chat, generateItinerary } from '../../services/openai'

// Mock the API call
jest.mock('../../services/api', () => ({
  callFunction: jest.fn(),
}))

describe('OpenAI Service', () => {
  const mockContext = {
    location: { latitude: 35.6762, longitude: 139.6503 },
    neighborhood: 'Shibuya',
    timeOfDay: 'evening' as const,
    weather: null,
    budgetRemaining: 5000,
    dailyBudget: 10000,
    preferences: {
      homeBase: null,
      walkingTolerance: 'moderate' as const,
      budget: 'moderate' as const,
      dietary: [],
      interests: [],
      avoidCrowds: false,
    },
    visitedPlaces: [],
    completedStamps: [],
    excludedToday: [],
    totalWalkingToday: 0,
  }

  it('returns structured response with content', async () => {
    const response = await chat('Find me ramen nearby', mockContext, [])
    expect(response).toHaveProperty('content')
    expect(typeof response.content).toBe('string')
  })

  it('handles empty message gracefully', async () => {
    const response = await chat('', mockContext, [])
    expect(response.content).toBeDefined()
  })
})
```

```typescript
// __tests__/stores/useConversationStore.test.ts
import { useConversationStore } from '../../stores/useConversationStore'

describe('Conversation Store', () => {
  beforeEach(() => {
    useConversationStore.getState().clearAll()
  })

  it('starts a new conversation', () => {
    const id = useConversationStore.getState().startNewConversation('Tokyo')
    expect(id).toMatch(/^conv-\d+$/)
    expect(useConversationStore.getState().currentConversationId).toBe(id)
  })

  it('adds messages to current conversation', () => {
    useConversationStore.getState().startNewConversation()
    useConversationStore.getState().addMessage({
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    })

    const conv = useConversationStore.getState().getCurrentConversation()
    expect(conv?.messages).toHaveLength(1)
    expect(conv?.messages[0].content).toBe('Hello')
  })

  it('limits messages per conversation', () => {
    useConversationStore.getState().startNewConversation()

    // Add 150 messages
    for (let i = 0; i < 150; i++) {
      useConversationStore.getState().addMessage({
        id: `msg-${i}`,
        role: 'user',
        content: `Message ${i}`,
        timestamp: Date.now(),
      })
    }

    const conv = useConversationStore.getState().getCurrentConversation()
    expect(conv?.messages.length).toBeLessThanOrEqual(100)
  })
})
```

### 2.3 Rate Limiting

```typescript
// utils/rateLimit.ts
interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  check(key: string = 'default'): { allowed: boolean; retryAfter?: number } {
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // Get or create request timestamps for this key
    let timestamps = this.requests.get(key) || []

    // Remove old timestamps
    timestamps = timestamps.filter((t) => t > windowStart)

    if (timestamps.length >= this.config.maxRequests) {
      const oldestInWindow = timestamps[0]
      const retryAfter = Math.ceil((oldestInWindow + this.config.windowMs - now) / 1000)
      return { allowed: false, retryAfter }
    }

    // Add current timestamp
    timestamps.push(now)
    this.requests.set(key, timestamps)

    return { allowed: true }
  }

  reset(key: string = 'default') {
    this.requests.delete(key)
  }
}

// Chat rate limiter: 10 messages per minute
export const chatRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
})

// API rate limiter: 30 requests per minute
export const apiRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
})
```

**Usage in chat:**
```typescript
// app/(tabs)/index.tsx
import { chatRateLimiter } from '../../utils/rateLimit'

const handleSendMessage = async () => {
  const { allowed, retryAfter } = chatRateLimiter.check()

  if (!allowed) {
    Alert.alert(
      'Slow down',
      `Too many messages. Please wait ${retryAfter} seconds.`
    )
    return
  }

  // ... rest of send logic
}
```

### 2.4 Input Sanitization

```typescript
// utils/sanitize.ts

// Remove potential prompt injection patterns
export function sanitizeUserInput(input: string): string {
  // Remove common injection patterns
  let sanitized = input
    .replace(/\[SYSTEM\]/gi, '[USER]')
    .replace(/\[INST\]/gi, '')
    .replace(/<<SYS>>/gi, '')
    .replace(/<\|im_start\|>/gi, '')
    .replace(/<\|im_end\|>/gi, '')
    .replace(/###\s*(System|Human|Assistant):/gi, '')

  // Limit length
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000)
  }

  return sanitized.trim()
}

// Validate coordinates
export function validateCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  )
}

// Sanitize place names for display
export function sanitizePlaceName(name: string): string {
  return name
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 100) // Limit length
    .trim()
}
```

---

## Security Checklist

### Before Alpha/Beta Release

- [ ] API keys moved to backend (Supabase Edge Functions)
- [ ] Sentry configured and receiving errors
- [ ] Memory limits on conversations
- [ ] Rate limiting on chat
- [ ] Logger utility replacing console.log
- [ ] Input sanitization on user messages
- [ ] CI/CD pipeline running on PRs
- [ ] Core tests passing (>20 tests)

### Before Public Release

- [ ] All Phase 1 items complete
- [ ] All Phase 2 items complete
- [ ] Device testing on real iPhone
- [ ] TestFlight beta with 10+ users
- [ ] No critical bugs from beta feedback
- [ ] Privacy policy and terms of service
- [ ] App Store listing prepared

### Ongoing

- [ ] Monitor Sentry for new errors
- [ ] Review rate limit logs
- [ ] Increase test coverage to 60%+
- [ ] Performance monitoring
- [ ] Security audit quarterly

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         TOMO APP                                  │
│                    (React Native/Expo)                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│   │    Chat     │    │    Maps     │    │   Voice     │         │
│   │   Screen    │    │   Screen    │    │   Screen    │         │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│          │                  │                  │                 │
│   ┌──────┴──────────────────┴──────────────────┴──────┐         │
│   │                   Services Layer                    │         │
│   │   (api.ts, openai.ts, places.ts, routes.ts)        │         │
│   └──────────────────────┬─────────────────────────────┘         │
│                          │                                        │
│                          │ HTTPS (no API keys!)                  │
│                          ▼                                        │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │
┌──────────────────────────┴───────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                        │
│                    (Deno, runs at edge)                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│   │    /chat    │    │   /places   │    │   /routes   │         │
│   │  Function   │    │  Function   │    │  Function   │         │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│          │                  │                  │                 │
│   ┌──────┴──────────────────┴──────────────────┴──────┐         │
│   │              SECRETS (server-side only)             │         │
│   │   • OPENAI_API_KEY                                  │         │
│   │   • GOOGLE_PLACES_API_KEY                           │         │
│   │   • GOOGLE_ROUTES_API_KEY                           │         │
│   └─────────────────────────────────────────────────────┘         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS (with API keys)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      EXTERNAL APIs                                │
├──────────────────────────────────────────────────────────────────┤
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│   │   OpenAI    │    │   Google    │    │   Google    │         │
│   │   GPT-4o    │    │   Places    │    │   Routes    │         │
│   └─────────────┘    └─────────────┘    └─────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Questions?

If you're implementing this and have questions:
1. Check the code examples above
2. Review the Supabase Edge Functions docs: https://supabase.com/docs/guides/functions
3. Check Sentry React Native docs: https://docs.sentry.io/platforms/react-native/

The security of this app is critical. Don't skip Phase 1.
