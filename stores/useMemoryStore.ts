import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Memory, MemoryType } from '../types';

interface MemoryState {
  memories: Memory[];

  // Add memory
  addMemory: (memory: Omit<Memory, 'id' | 'timestamp'>) => void;

  // Remove memory
  removeMemory: (id: string) => void;

  // Update memory
  updateMemory: (id: string, updates: Partial<Memory>) => void;

  // Get memories by type
  getMemoriesByType: (type: MemoryType) => Memory[];

  // Get memories by category
  getMemoriesByCategory: (category: string) => Memory[];

  // Mark memory as used (updates lastUsed timestamp)
  markMemoryUsed: (id: string) => void;

  // Get all memories formatted for Claude context
  getMemoryContext: () => string;

  // Clear all memories
  clearMemories: () => void;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],

      addMemory: (memoryData) => {
        const memory: Memory = {
          ...memoryData,
          id: `memory-${Date.now()}`,
          timestamp: Date.now(),
          lastUsed: Date.now(),
        };

        set((state) => ({
          memories: [...state.memories, memory],
        }));

        console.log('[Memory] Added:', memory.content);
      },

      removeMemory: (id) => {
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        }));
        console.log('[Memory] Removed:', id);
      },

      updateMemory: (id, updates) => {
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
        console.log('[Memory] Updated:', id);
      },

      getMemoriesByType: (type) => {
        return get().memories.filter((m) => m.type === type);
      },

      getMemoriesByCategory: (category) => {
        return get().memories.filter((m) => m.category === category);
      },

      markMemoryUsed: (id) => {
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, lastUsed: Date.now() } : m
          ),
        }));
      },

      getMemoryContext: () => {
        const memories = get().memories;

        if (memories.length === 0) {
          return '';
        }

        // Group by type
        const likes = memories.filter((m) => m.type === 'like').map((m) => m.content);
        const dislikes = memories.filter((m) => m.type === 'dislike').map((m) => m.content);
        const preferences = memories.filter((m) => m.type === 'preference').map((m) => m.content);
        const feedback = memories.filter((m) => m.type === 'visited_feedback').map((m) => m.content);
        const personalInfo = memories.filter((m) => m.type === 'personal_info').map((m) => m.content);
        const avoid = memories.filter((m) => m.type === 'avoid').map((m) => m.content);

        let context = '\n\n[MEMORY - Things I Remember About You]';

        if (personalInfo.length > 0) {
          context += `\nPersonal Info: ${personalInfo.join(', ')}`;
        }

        if (likes.length > 0) {
          context += `\nLikes: ${likes.join(', ')}`;
        }

        if (dislikes.length > 0) {
          context += `\nDislikes: ${dislikes.join(', ')}`;
        }

        if (preferences.length > 0) {
          context += `\nPreferences: ${preferences.join(', ')}`;
        }

        if (avoid.length > 0) {
          context += `\nAvoid: ${avoid.join(', ')}`;
        }

        if (feedback.length > 0) {
          context += `\nPast Feedback: ${feedback.join(', ')}`;
        }

        context += '\n\nIMPORTANT: Use this memory when making recommendations. Never suggest things I dislike or places I want to avoid. Prioritize things I like and align with my preferences.';

        return context;
      },

      clearMemories: () => {
        set({ memories: [] });
        console.log('[Memory] Cleared all memories');
      },
    }),
    {
      name: 'tomo-memory-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
