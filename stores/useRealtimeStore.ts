/**
 * Zustand store for Realtime voice session state
 * Replaces global module-level session variable to avoid stale references
 */

import { create } from 'zustand';
import { Audio } from 'expo-av';

export type RealtimeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type VoiceActivityState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface RealtimeCallbacks {
  onConnectionStateChange?: (state: RealtimeConnectionState) => void;
  onVoiceActivityChange?: (state: VoiceActivityState) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAssistantResponse?: (text: string) => void;
  onError?: (error: string) => void;
  onAudioOutput?: (audio: ArrayBuffer) => void;
}

interface RealtimeSession {
  ws: WebSocket | null;
  recording: Audio.Recording | null;
  playbackObject: Audio.Sound | null;
  callbacks: RealtimeCallbacks;
  connectionState: RealtimeConnectionState;
  voiceActivityState: VoiceActivityState;
}

interface RealtimeStoreState {
  session: RealtimeSession | null;

  // Actions
  setSession: (session: RealtimeSession | null) => void;
  updateConnectionState: (state: RealtimeConnectionState) => void;
  updateVoiceActivityState: (state: VoiceActivityState) => void;
  setWebSocket: (ws: WebSocket | null) => void;
  setRecording: (recording: Audio.Recording | null) => void;
  setPlaybackObject: (playbackObject: Audio.Sound | null) => void;
  clearSession: () => void;

  // Getters
  getSession: () => RealtimeSession | null;
  isConnected: () => boolean;
}

export const useRealtimeStore = create<RealtimeStoreState>((set, get) => ({
  session: null,

  setSession: (session) => set({ session }),

  updateConnectionState: (connectionState) => {
    const { session } = get();
    if (session) {
      set({
        session: { ...session, connectionState },
      });
      session.callbacks.onConnectionStateChange?.(connectionState);
    }
  },

  updateVoiceActivityState: (voiceActivityState) => {
    const { session } = get();
    if (session) {
      set({
        session: { ...session, voiceActivityState },
      });
      session.callbacks.onVoiceActivityChange?.(voiceActivityState);
    }
  },

  setWebSocket: (ws) => {
    const { session } = get();
    if (session) {
      set({ session: { ...session, ws } });
    }
  },

  setRecording: (recording) => {
    const { session } = get();
    if (session) {
      set({ session: { ...session, recording } });
    }
  },

  setPlaybackObject: (playbackObject) => {
    const { session } = get();
    if (session) {
      set({ session: { ...session, playbackObject } });
    }
  },

  clearSession: () => set({ session: null }),

  getSession: () => get().session,

  isConnected: () => get().session?.connectionState === 'connected',
}));
