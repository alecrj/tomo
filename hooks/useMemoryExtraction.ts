import { useEffect, useRef, useCallback } from 'react';
import { useMemoryStore } from '../stores/useMemoryStore';
import { useConversationStore } from '../stores/useConversationStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import type { Memory, MemoryType, ChatMessage } from '../types';

// Patterns to detect preferences and learnings from user messages
interface ExtractionPattern {
  pattern: RegExp;
  type: MemoryType;
  category: string;
  extract: (match: RegExpMatchArray) => string;
}

const EXTRACTION_PATTERNS: ExtractionPattern[] = [
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
  {
    pattern: /no (\w+) (?:please|for me)/i,
    type: 'avoid',
    category: 'dietary',
    extract: (match) => `does not want ${match[1]}`,
  },

  // Food preferences
  {
    pattern: /i (?:love|really like|adore|enjoy) (\w+(?:\s+\w+)?) (?:food|cuisine|dishes)/i,
    type: 'like',
    category: 'food',
    extract: (match) => `loves ${match[1]} food`,
  },
  {
    pattern: /i (?:love|really like|adore) (spicy|sweet|sour|salty|bitter|umami) (?:food|things|dishes)?/i,
    type: 'like',
    category: 'food',
    extract: (match) => `loves ${match[1]} flavors`,
  },
  {
    pattern: /i (?:hate|dislike|can't stand|don't like) (\w+(?:\s+\w+)?) (?:food|cuisine|dishes)/i,
    type: 'dislike',
    category: 'food',
    extract: (match) => `dislikes ${match[1]} food`,
  },
  {
    pattern: /i (?:hate|dislike|can't stand) (spicy|sweet|sour|salty) (?:food|things)?/i,
    type: 'dislike',
    category: 'food',
    extract: (match) => `dislikes ${match[1]} flavors`,
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
  {
    pattern: /i (?:prefer|like) (local|authentic|traditional|modern|trendy) (?:places|spots|restaurants)?/i,
    type: 'preference',
    category: 'place_type',
    extract: (match) => `prefers ${match[1]} places`,
  },

  // Activity preferences
  {
    pattern: /i (?:love|enjoy|like) (hiking|walking|biking|swimming|shopping|art|museums|history|architecture|photography|nature)/i,
    type: 'like',
    category: 'activity',
    extract: (match) => `enjoys ${match[1]}`,
  },
  {
    pattern: /i (?:don't like|hate|avoid) (hiking|walking|biking|swimming|shopping|museums|crowds)/i,
    type: 'dislike',
    category: 'activity',
    extract: (match) => `avoids ${match[1]}`,
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

  // Budget preferences
  {
    pattern: /i(?:'m|'m| am) on a (?:tight|strict|limited) budget/i,
    type: 'preference',
    category: 'budget',
    extract: () => 'on a tight budget',
  },
  {
    pattern: /(?:money|budget|price) (?:is|isn't|isnt) (?:not )?(?:a|an) (?:issue|concern|problem)/i,
    type: 'preference',
    category: 'budget',
    extract: (match) => match[0].includes("isn't") || match[0].includes("isnt") || match[0].includes("not")
      ? 'budget-conscious'
      : 'flexible budget',
  },

  // Place feedback
  {
    pattern: /(\w+(?:\s+\w+)?) was (amazing|great|awesome|fantastic|terrible|bad|awful|overrated|underwhelming|disappointing)/i,
    type: 'visited_feedback',
    category: 'place_feedback',
    extract: (match) => `${match[1]} was ${match[2]}`,
  },
  {
    pattern: /i (?:really )?(?:loved|enjoyed|hated|disliked) (\w+(?:\s+\w+)?)/i,
    type: 'visited_feedback',
    category: 'place_feedback',
    extract: (match) => `${match[0].includes('loved') || match[0].includes('enjoyed') ? 'loved' : 'disliked'} ${match[1]}`,
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
 */
export function useMemoryExtraction() {
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // Memory store
  const memories = useMemoryStore((state) => state.memories);
  const addMemory = useMemoryStore((state) => state.addMemory);

  // Conversation store
  const conversations = useConversationStore((state) => state.conversations);
  const currentConversationId = useConversationStore((state) => state.currentConversationId);

  // Notification store for "Tomo learned" toasts
  const addNotification = useNotificationStore((state) => state.addNotification);

  /**
   * Extract memories from a single message
   */
  const extractFromMessage = useCallback((message: ChatMessage): { type: MemoryType; content: string; category: string }[] => {
    if (message.role !== 'user') return [];

    const extracted: { type: MemoryType; content: string; category: string }[] = [];

    for (const pattern of EXTRACTION_PATTERNS) {
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
   * Process new messages and extract memories
   */
  const processMessages = useCallback(() => {
    const currentConversation = conversations.find((c) => c.id === currentConversationId);
    if (!currentConversation) return;

    const newLearnings: { type: MemoryType; content: string; category: string }[] = [];

    for (const message of currentConversation.messages) {
      // Skip if already processed
      if (processedMessagesRef.current.has(message.id)) continue;

      // Extract memories from message
      const extracted = extractFromMessage(message);

      for (const learning of extracted) {
        // Check if similar memory already exists
        if (!isSimilarMemoryExists(memories, learning.content)) {
          newLearnings.push(learning);
        }
      }

      // Mark as processed
      processedMessagesRef.current.add(message.id);
    }

    // Add new learnings to memory store and show notifications
    for (const learning of newLearnings) {
      addMemory({
        type: learning.type,
        category: learning.category,
        content: learning.content,
      });

      // Show "Tomo learned" notification
      addNotification({
        type: 'itinerary', // Using itinerary type for general info
        priority: 'info',
        title: 'Tomo learned',
        body: formatLearningForDisplay(learning.content),
        expiresAt: Date.now() + 10000, // 10 seconds
      });

      console.log('[MemoryExtraction] Learned:', learning.content);
    }
  }, [conversations, currentConversationId, memories, extractFromMessage, addMemory, addNotification]);

  // Process messages when conversation changes
  useEffect(() => {
    processMessages();
  }, [processMessages]);

  return {
    processMessages,
    extractFromMessage,
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
