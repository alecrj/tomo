/**
 * OpenAI Realtime API Service (WebRTC Implementation)
 *
 * This service enables real-time voice conversations with OpenAI's gpt-realtime model.
 * Uses WebRTC for low-latency, native audio handling.
 *
 * MODEL: gpt-realtime (GA model, released Aug 2025)
 * DO NOT USE: gpt-4o-realtime-preview (deprecated, removal Feb 2026)
 *
 * Architecture:
 * - WebRTC peer connection for audio streaming
 * - Data channel for events (transcripts, responses, etc.)
 * - Server-side VAD for natural turn-taking
 *
 * For production: Use ephemeral tokens from your backend.
 * For development: Direct API key works but exposes key in client.
 */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
  MediaStreamTrack,
  // @ts-ignore - Types differ from web standard
  RTCDataChannel,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

// Type augmentation for react-native-webrtc (types differ from web standard)
type RNRTCPeerConnection = RTCPeerConnection & {
  ontrack: ((event: any) => void) | null;
  oniceconnectionstatechange: (() => void) | null;
  iceConnectionState: string;
};

type RNRTCDataChannel = {
  readyState: string;
  onopen: (() => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((error: any) => void) | null;
  onclose: (() => void) | null;
  send: (data: string) => void;
  close: () => void;
};
import { useRealtimeStore } from '../stores/useRealtimeStore';
import { useOfflineStore } from '../stores/useOfflineStore';

// =============================================================================
// Configuration
// =============================================================================

const REALTIME_API_URL = 'https://api.openai.com/v1/realtime';
const MODEL = 'gpt-realtime'; // GA model - DO NOT change to old preview models

// Get API key from environment
const getApiKey = () => process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

// =============================================================================
// Types
// =============================================================================

export type RealtimeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type VoiceActivityState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface RealtimeCallbacks {
  onConnectionStateChange?: (state: RealtimeConnectionState) => void;
  onVoiceActivityChange?: (state: VoiceActivityState) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAssistantResponse?: (text: string) => void;
  onError?: (error: string) => void;
  onAudioOutput?: (audioData: ArrayBuffer) => void;
}

export interface RealtimeMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface RealtimeSession {
  pc: RNRTCPeerConnection | null;
  dataChannel: RNRTCDataChannel | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callbacks: RealtimeCallbacks;
  connectionState: RealtimeConnectionState;
  voiceActivityState: VoiceActivityState;
}

// Module-level session reference (managed via Zustand store for persistence)
let currentSession: RealtimeSession | null = null;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get current session from module state
 */
const getSession = (): RealtimeSession | null => currentSession;

/**
 * Update session in module state
 */
const setSession = (session: RealtimeSession | null) => {
  currentSession = session;
};

/**
 * Update connection state in both module and store
 */
const updateConnectionState = (state: RealtimeConnectionState) => {
  if (currentSession) {
    currentSession.connectionState = state;
  }
  useRealtimeStore.getState().updateConnectionState(state);
};

/**
 * Update voice activity state in both module and store
 */
const updateVoiceActivityState = (state: VoiceActivityState) => {
  if (currentSession) {
    currentSession.voiceActivityState = state;
  }
  useRealtimeStore.getState().updateVoiceActivityState(state);
};

// =============================================================================
// WebRTC Event Handlers
// =============================================================================

/**
 * Handle incoming data channel messages (events from OpenAI)
 */
function handleDataChannelMessage(event: MessageEvent, callbacks: RealtimeCallbacks) {
  try {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'session.created':
        break;

      case 'session.updated':
        break;

      case 'input_audio_buffer.speech_started':
        updateVoiceActivityState('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        updateVoiceActivityState('processing');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        callbacks.onTranscript?.(message.transcript, true);
        break;

      case 'response.audio_transcript.delta':
        // Streaming text from assistant
        callbacks.onAssistantResponse?.(message.delta);
        break;

      case 'response.audio_transcript.done':
        break;

      case 'response.audio.delta':
        // Audio is being streamed - handled automatically by WebRTC track
        if (currentSession?.voiceActivityState !== 'speaking') {
          updateVoiceActivityState('speaking');
        }
        break;

      case 'response.audio.done':
        updateVoiceActivityState('idle');
        break;

      case 'response.done':
        updateVoiceActivityState('idle');
        break;

      case 'error':
        console.error('[Realtime] API error:', message.error);
        callbacks.onError?.(message.error?.message || 'Unknown API error');
        break;

      default:
    }
  } catch (error) {
    console.error('[Realtime] Error parsing data channel message:', error);
  }
}

// =============================================================================
// Main API Functions
// =============================================================================

/**
 * Initialize a new realtime voice session using WebRTC
 *
 * @param callbacks - Event callbacks for state changes, transcripts, etc.
 * @param systemPrompt - Custom system prompt for Tomo
 * @returns Promise<boolean> - True if connection successful
 */
export async function initRealtimeSession(
  callbacks: RealtimeCallbacks,
  systemPrompt?: string
): Promise<boolean> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error('[Realtime] No API key configured');
    callbacks.onError?.('OpenAI API key not configured');
    return false;
  }

  // Check if we're online
  if (!useOfflineStore.getState().isOnline) {
    console.error('[Realtime] Cannot start voice session while offline');
    callbacks.onError?.('Voice mode requires an internet connection');
    return false;
  }

  // Close existing session if any
  closeRealtimeSession();

  // Create new session
  const session: RealtimeSession = {
    pc: null,
    dataChannel: null,
    localStream: null,
    remoteStream: null,
    callbacks,
    connectionState: 'connecting',
    voiceActivityState: 'idle',
  };

  setSession(session);
  updateConnectionState('connecting');
  callbacks.onConnectionStateChange?.('connecting');

  try {
    // 0. Start audio session - THIS IS CRITICAL FOR AUDIO TO PLAY
    InCallManager.start({ media: 'audio' });
    InCallManager.setSpeakerphoneOn(true); // Route to speaker, not earpiece

    // 1. Request microphone permission and get local audio stream
    const localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    }) as MediaStream;
    session.localStream = localStream;

    // 2. Create RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    }) as unknown as RNRTCPeerConnection;
    session.pc = pc;

    // 3. Add local audio track to peer connection
    localStream.getTracks().forEach((track: MediaStreamTrack) => {
      (pc as any).addTrack(track, localStream);
    });

    // 4. Handle remote audio track (Tomo's voice)
    // With InCallManager started and speaker enabled, the audio will play automatically
    // when the remote track is received via WebRTC
    pc.ontrack = (event: any) => {

      if (event.streams && event.streams[0]) {
        session.remoteStream = event.streams[0];

        // The audio plays automatically via react-native-webrtc + InCallManager
        // InCallManager routes it to the speaker (set above)
        // No additional handling needed - this is the magic of WebRTC!
      }
    };

    // 5. Create data channel for events
    const dataChannel = (pc as any).createDataChannel('oai-events') as RNRTCDataChannel;
    session.dataChannel = dataChannel;

    dataChannel.onopen = () => {

      // Configure the session
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          instructions: systemPrompt || `You are Tomo, a friendly AI travel companion.
You help travelers navigate, discover places, and enjoy their trips.
Be conversational, helpful, and concise. You're speaking via voice, so keep responses brief and natural.
If asked about places, provide specific recommendations with names and walking directions.
Be warm and friendly like a local friend showing someone around.`,
        },
      };

      dataChannel.send(JSON.stringify(sessionConfig));
    };

    dataChannel.onmessage = (event: MessageEvent) => {
      handleDataChannelMessage(event, callbacks);
    };

    dataChannel.onerror = (error: any) => {
      console.error('[Realtime] Data channel error:', error);
      callbacks.onError?.('Data channel error');
    };

    dataChannel.onclose = () => {
    };

    // 6. Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {

      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        updateConnectionState('connected');
        callbacks.onConnectionStateChange?.('connected');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        updateConnectionState('error');
        callbacks.onConnectionStateChange?.('error');
        callbacks.onError?.('Connection failed');
      }
    };

    // 7. Create SDP offer
    const offer = await (pc as any).createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await (pc as any).setLocalDescription(offer);

    // 8. Send offer to OpenAI Realtime API
    const response = await fetch(`${REALTIME_API_URL}?model=${MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Realtime] API error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    // 9. Set remote description from OpenAI's answer
    const answerSdp = await response.text();

    const answer = new RTCSessionDescription({
      type: 'answer',
      sdp: answerSdp,
    });
    await (pc as any).setRemoteDescription(answer);

    return true;
  } catch (error) {
    console.error('[Realtime] Init error:', error);
    updateConnectionState('error');
    callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error');
    closeRealtimeSession();
    return false;
  }
}

/**
 * Send a text message through the realtime session
 * (For when user types instead of speaks)
 */
export function sendTextMessage(text: string): void {
  const session = getSession();

  if (!session?.dataChannel || session.dataChannel.readyState !== 'open') {
    console.error('[Realtime] Cannot send message - data channel not open');
    return;
  }

  // Create a conversation item with user message
  const message = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text,
        },
      ],
    },
  };

  session.dataChannel.send(JSON.stringify(message));

  // Request a response
  session.dataChannel.send(JSON.stringify({
    type: 'response.create',
  }));

}

/**
 * Interrupt the current response (stop Tomo mid-sentence)
 */
export function interruptResponse(): void {
  const session = getSession();

  if (!session?.dataChannel || session.dataChannel.readyState !== 'open') {
    return;
  }

  session.dataChannel.send(JSON.stringify({
    type: 'response.cancel',
  }));

}

/**
 * Mute/unmute the microphone
 */
export function setMicrophoneMuted(muted: boolean): void {
  const session = getSession();

  if (!session?.localStream) {
    return;
  }

  session.localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
    track.enabled = !muted;
  });

}

/**
 * Close the realtime session and clean up resources
 */
export function closeRealtimeSession(): void {
  const session = getSession();
  if (!session) return;


  // Stop local audio tracks
  if (session.localStream) {
    session.localStream.getTracks().forEach((track: MediaStreamTrack) => {
      track.stop();
    });
  }

  // Close data channel
  if (session.dataChannel) {
    session.dataChannel.close();
  }

  // Close peer connection
  if (session.pc) {
    (session.pc as any).close();
  }

  // Stop audio session - critical to release audio resources
  InCallManager.stop();

  // Clear session
  setSession(null);
  useRealtimeStore.getState().clearSession();

}

/**
 * Get current connection state
 */
export function getConnectionState(): RealtimeConnectionState {
  return getSession()?.connectionState ?? 'disconnected';
}

/**
 * Get current voice activity state
 */
export function getVoiceActivityState(): VoiceActivityState {
  return getSession()?.voiceActivityState ?? 'idle';
}

/**
 * Check if realtime API is supported
 */
export function isRealtimeSupported(): boolean {
  return !!getApiKey();
}

// =============================================================================
// Legacy WebSocket Implementation (Fallback)
// =============================================================================

/**
 * NOTE: The WebSocket implementation is kept as a fallback for debugging.
 * For production, use the WebRTC implementation above.
 *
 * WebSocket requires manual audio encoding/decoding and has higher latency.
 * WebRTC handles audio natively with lower latency.
 */

// Legacy functions for backwards compatibility with existing voice.tsx
export async function startListening(): Promise<boolean> {
  // With WebRTC, listening is always on (handled by VAD)
  // This function is now a no-op but kept for API compatibility
  return true;
}

export async function stopListening(): Promise<void> {
  // With WebRTC, the server VAD handles turn detection
  // This function is now a no-op but kept for API compatibility
}
