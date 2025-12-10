import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, ChatMessage } from '../types';

interface ConversationState {
  conversations: Conversation[];
  currentConversationId: string | null;

  // Create new conversation
  startNewConversation: (location?: string, tripId?: string) => string;

  // Get current conversation
  getCurrentConversation: () => Conversation | null;

  // Add message to current conversation
  addMessage: (message: ChatMessage) => void;

  // Switch to existing conversation
  switchConversation: (conversationId: string) => void;

  // Update conversation title
  updateConversationTitle: (conversationId: string, title: string) => void;

  // Update conversation summary
  updateConversationSummary: (conversationId: string, summary: string) => void;

  // Delete conversation
  deleteConversation: (conversationId: string) => void;

  // Get all conversations sorted by recent
  getAllConversations: () => Conversation[];

  // Clear all conversations
  clearAll: () => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,

      startNewConversation: (location, tripId) => {
        const conversationId = `conv-${Date.now()}`;
        const now = Date.now();

        const newConversation: Conversation = {
          id: conversationId,
          title: `Chat ${new Date(now).toLocaleDateString()}`,
          startedAt: now,
          lastMessageAt: now,
          messages: [],
          location,
          tripId,
          messageCount: 0,
        };

        set((state) => ({
          conversations: [...state.conversations, newConversation],
          currentConversationId: conversationId,
        }));

        console.log('[Conversation] Started new:', conversationId);
        return conversationId;
      },

      getCurrentConversation: () => {
        const { conversations, currentConversationId } = get();
        return conversations.find((c) => c.id === currentConversationId) || null;
      },

      addMessage: (message) => {
        const { currentConversationId } = get();
        if (!currentConversationId) {
          // Auto-start conversation if none exists
          get().startNewConversation();
        }

        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === state.currentConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, message],
                  lastMessageAt: Date.now(),
                  messageCount: conv.messageCount + 1,
                  // Auto-update title from first user message
                  title:
                    conv.messageCount === 0 && message.role === 'user'
                      ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                      : conv.title,
                }
              : conv
          ),
        }));
      },

      switchConversation: (conversationId) => {
        set({ currentConversationId: conversationId });
        console.log('[Conversation] Switched to:', conversationId);
      },

      updateConversationTitle: (conversationId, title) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, title } : conv
          ),
        }));
      },

      updateConversationSummary: (conversationId, summary) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, summary } : conv
          ),
        }));
      },

      deleteConversation: (conversationId) => {
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== conversationId);
          const newCurrentId =
            state.currentConversationId === conversationId
              ? newConversations[0]?.id || null
              : state.currentConversationId;

          return {
            conversations: newConversations,
            currentConversationId: newCurrentId,
          };
        });
        console.log('[Conversation] Deleted:', conversationId);
      },

      getAllConversations: () => {
        return get().conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      },

      clearAll: () => {
        set({
          conversations: [],
          currentConversationId: null,
        });
        console.log('[Conversation] Cleared all');
      },
    }),
    {
      name: 'tomo-conversation-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
