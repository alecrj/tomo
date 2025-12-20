import { useEffect, useRef, useCallback } from 'react';
import { useMemoryStore } from '../stores/useMemoryStore';
import { useConversationStore } from '../stores/useConversationStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useOfflineStore } from '../stores/useOfflineStore';
import type { Memory, MemoryType, ChatMessage } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface ExtractedMemory {
  type: MemoryType;
  category: string;
  content: string;
  confidence: number;
}

/**
 * Use AI to extract preferences from a message
 */
async function extractMemoriesWithAI(message: string, signal?: AbortSignal): Promise<ExtractedMemory[]> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) return [];

    // Check if online
    if (!useOfflineStore.getState().isOnline) {
      return [];
    }

    const response = await fetch(OPENAI_API_URL, {
      signal, // AbortController signal for cancellation
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini', // Fast + capable model for extraction
        messages: [
          {
            role: 'system',
            content: `You extract personal preferences, facts, and patterns from user messages for a travel app.

Extract ONLY concrete, reusable preferences that would help personalize future travel recommendations.

Categories to extract:
- dietary: Food restrictions, allergies, diet type (vegetarian, vegan, etc.)
- food: Cuisine preferences, flavor preferences
- place_type: Prefers quiet/busy, local/touristy, etc.
- activity: Hobbies, interests, things they enjoy doing
- travel_style: Budget level, pace, crowd tolerance
- personal_info: Traveling solo/with family, accessibility needs
- place_feedback: Opinion about a specific place they visited

Return JSON array. If no preferences found, return empty array.

Example output:
[
  {"type": "preference", "category": "dietary", "content": "vegetarian", "confidence": 0.95},
  {"type": "like", "category": "activity", "content": "enjoys hiking and nature", "confidence": 0.8}
]

Only extract if confidence > 0.7. Be conservative - only extract clear preferences.`
          },
          {
            role: 'user',
            content: `Extract preferences from this message:\n\n"${message}"`
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('[MemoryExtraction] AI API error:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return [];

    const parsed = JSON.parse(content);

    // Handle various response formats from the AI
    let memories: ExtractedMemory[] = [];
    if (Array.isArray(parsed)) {
      memories = parsed;
    } else if (Array.isArray(parsed.memories)) {
      memories = parsed.memories;
    } else if (Array.isArray(parsed.preferences)) {
      memories = parsed.preferences;
    } else if (Array.isArray(parsed.extracted)) {
      memories = parsed.extracted;
    }
    // If still not an array, return empty
    if (!Array.isArray(memories)) {
      console.log('[MemoryExtraction] No memories extracted from response');
      return [];
    }

    // Filter by confidence
    return memories.filter((m: ExtractedMemory) => m.confidence >= 0.7);
  } catch (error) {
    // Don't log abort errors - they're intentional
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    console.error('[MemoryExtraction] AI extraction error:', error);
    return [];
  }
}

// Fallback regex patterns for when AI is unavailable
interface ExtractionPattern {
  pattern: RegExp;
  type: MemoryType;
  category: string;
  extract: (match: RegExpMatchArray) => string;
}

const FALLBACK_PATTERNS: ExtractionPattern[] = [
  // Dietary restrictions
  {
    pattern: /i(?:'m|'m| am) (vegetarian|vegan|pescatarian|gluten[- ]free|lactose[- ]intolerant|kosher|halal)/i,
    type: 'preference',
    category: 'dietary',
    extract: (match) => `is ${match[1]}`,
  },
  {
    pattern: /i (?:can't|cannot|don't|do not) eat (\w+(?:\s+\w+)?)/i,
    type: 'avoid',
    category: 'dietary',
    extract: (match) => `cannot eat ${match[1]}`,
  },
  {
    pattern: /(?:i(?:'m|'m| am) )?allergic to (\w+(?:\s+\w+)?)/i,
    type: 'avoid',
    category: 'dietary',
    extract: (match) => `allergic to ${match[1]}`,
  },
  // Travel companions
  {
    pattern: /(?:i(?:'m|'m| am) )?travel(?:l)?ing (?:with|alone|solo|with my )(\w+(?:\s+\w+)?)?/i,
    type: 'personal_info',
    category: 'travel_companion',
    extract: (match) => match[1] ? `traveling with ${match[1]}` : 'traveling solo',
  },
  {
    pattern: /(?:we(?:'re|'re| are) )?(?:a )?(?:couple|family|group of friends|with kids|with children)/i,
    type: 'personal_info',
    category: 'travel_companion',
    extract: (match) => `traveling as ${match[0].replace(/^(we('re|'re| are)\s+)?/, '')}`,
  },
  // Budget
  {
    pattern: /i(?:'m|'m| am) on a (?:tight|strict|limited) budget/i,
    type: 'preference',
    category: 'budget',
    extract: () => 'on a tight budget',
  },
  // Place preferences
  {
    pattern: /i (?:prefer|like|love) (quiet|loud|busy|crowded|peaceful|lively) (?:places|spots|restaurants|cafes)?/i,
    type: 'preference',
    category: 'place_type',
    extract: (match) => `prefers ${match[1]} places`,
  },
  {
    pattern: /i (?:don't like|hate|avoid) (crowds|crowded places|busy places|touristy spots)/i,
    type: 'preference',
    category: 'place_type',
    extract: (match) => `avoids crowded/touristy places`,
  },
];

// Simple deduplication - check if similar memory already exists
function isSimilarMemoryExists(memories: Memory[], newContent: string): boolean {
  const normalizedNew = newContent.toLowerCase().trim();

  return memories.some((m) => {
    const normalizedExisting = m.content.toLowerCase().trim();
    // Check for exact match or significant overlap
    return normalizedExisting === normalizedNew ||
           normalizedExisting.includes(normalizedNew) ||
           normalizedNew.includes(normalizedExisting);
  });
}

/**
 * Hook that automatically extracts memories/learnings from chat conversations
 * Uses AI for extraction with fallback to regex patterns
 */
export function useMemoryExtraction() {
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const aiProcessingRef = useRef<Set<string>>(new Set()); // Track messages being processed by AI
  // Use a Map to track AbortControllers per message ID to avoid race conditions
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  // Track last cleanup to prevent memory leaks
  const lastCleanupRef = useRef<number>(Date.now());

  // Memory store
  const memories = useMemoryStore((state) => state.memories);
  const addMemory = useMemoryStore((state) => state.addMemory);

  // Conversation store
  const conversations = useConversationStore((state) => state.conversations);
  const currentConversationId = useConversationStore((state) => state.currentConversationId);

  // Notification store for "Tomo learned" toasts
  const addNotification = useNotificationStore((state) => state.addNotification);

  /**
   * Extract memories using fallback regex patterns
   */
  const extractWithPatterns = useCallback((message: ChatMessage): { type: MemoryType; content: string; category: string }[] => {
    if (message.role !== 'user') return [];

    const extracted: { type: MemoryType; content: string; category: string }[] = [];

    for (const pattern of FALLBACK_PATTERNS) {
      const match = message.content.match(pattern.pattern);
      if (match) {
        const content = pattern.extract(match);
        extracted.push({
          type: pattern.type,
          content,
          category: pattern.category,
        });
      }
    }

    return extracted;
  }, []);

  /**
   * Cleanup old processed messages to prevent memory leaks
   */
  const cleanupProcessedMessages = useCallback(() => {
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;

    // Clean up if it's been more than an hour OR if Sets are too large
    if (now - lastCleanupRef.current > oneHourMs || processedMessagesRef.current.size > 500) {
      console.log('[MemoryExtraction] Cleaning up processed messages tracker');
      processedMessagesRef.current.clear();
      aiProcessingRef.current.clear();
      lastCleanupRef.current = now;
    }
  }, []);

  /**
   * Process a single message with AI extraction
   */
  const processMessageWithAI = useCallback(async (message: ChatMessage) => {
    if (message.role !== 'user') return;
    if (aiProcessingRef.current.has(message.id)) return;

    aiProcessingRef.current.add(message.id);

    // Create new abort controller for THIS specific message (avoids race condition)
    const abortController = new AbortController();
    abortControllersRef.current.set(message.id, abortController);
    const signal = abortController.signal;

    try {
      // Try AI extraction first
      const aiMemories = await extractMemoriesWithAI(message.content, signal);

      if (aiMemories.length > 0) {
        console.log('[MemoryExtraction] AI found memories:', aiMemories.length);

        for (const memory of aiMemories) {
          // Check if similar memory already exists
          if (!isSimilarMemoryExists(memories, memory.content)) {
            addMemory({
              type: memory.type,
              category: memory.category,
              content: memory.content,
            });

            // Show "Tomo learned" notification
            addNotification({
              type: 'itinerary',
              priority: 'info',
              title: 'Tomo learned',
              body: formatLearningForDisplay(memory.content),
              expiresAt: Date.now() + 10000,
            });

            console.log('[MemoryExtraction] AI Learned:', memory.content);
          }
        }
      } else {
        // Fallback to pattern matching if AI found nothing
        const patternMemories = extractWithPatterns(message);

        for (const learning of patternMemories) {
          if (!isSimilarMemoryExists(memories, learning.content)) {
            addMemory({
              type: learning.type,
              category: learning.category,
              content: learning.content,
            });

            addNotification({
              type: 'itinerary',
              priority: 'info',
              title: 'Tomo learned',
              body: formatLearningForDisplay(learning.content),
              expiresAt: Date.now() + 10000,
            });

            console.log('[MemoryExtraction] Pattern Learned:', learning.content);
          }
        }
      }
    } catch (error) {
      // Don't log abort errors - they're intentional
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('[MemoryExtraction] Error processing message:', error);
        // Fallback to patterns on error
        const patternMemories = extractWithPatterns(message);
        for (const learning of patternMemories) {
          if (!isSimilarMemoryExists(memories, learning.content)) {
            addMemory({
              type: learning.type,
              category: learning.category,
              content: learning.content,
            });
          }
        }
      }
    } finally {
      // Always cleanup: remove from processing set and abort controller map
      aiProcessingRef.current.delete(message.id);
      abortControllersRef.current.delete(message.id);
    }
  }, [memories, addMemory, addNotification, extractWithPatterns]);

  /**
   * Process new messages and extract memories
   */
  const processMessages = useCallback(() => {
    // Periodically cleanup to prevent memory leaks
    cleanupProcessedMessages();

    const currentConversation = conversations.find((c) => c.id === currentConversationId);
    if (!currentConversation) return;

    for (const message of currentConversation.messages) {
      // Skip if already processed
      if (processedMessagesRef.current.has(message.id)) continue;

      // Mark as processed immediately to prevent duplicate processing
      processedMessagesRef.current.add(message.id);

      // Process with AI (async, non-blocking)
      if (message.role === 'user' && message.content.length > 10) {
        // Only process messages with meaningful content
        processMessageWithAI(message);
      }
    }
  }, [conversations, currentConversationId, processMessageWithAI, cleanupProcessedMessages]);

  // Process messages when conversation changes
  useEffect(() => {
    processMessages();
  }, [processMessages]);

  // Cleanup: abort ALL pending requests on unmount
  useEffect(() => {
    return () => {
      // Abort all in-flight requests
      abortControllersRef.current.forEach((controller) => {
        controller.abort();
      });
      abortControllersRef.current.clear();
    };
  }, []);

  return {
    processMessages,
    extractWithPatterns,
  };
}

/**
 * Format learning content for user-friendly display
 */
function formatLearningForDisplay(content: string): string {
  // Capitalize first letter and add "You" prefix if needed
  const formatted = content.charAt(0).toUpperCase() + content.slice(1);

  if (formatted.startsWith('Is ') || formatted.startsWith('Are ')) {
    return `You ${formatted.toLowerCase()}`;
  }
  if (formatted.startsWith('Loves ') || formatted.startsWith('Enjoys ') ||
      formatted.startsWith('Prefers ') || formatted.startsWith('Dislikes ') ||
      formatted.startsWith('Avoids ') || formatted.startsWith('Cannot ')) {
    return `You ${formatted.toLowerCase()}`;
  }

  return formatted;
}

export default useMemoryExtraction;
