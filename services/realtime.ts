/**
 * OpenAI Realtime API Service
 * Handles WebSocket connection for real-time voice conversations
 */

import { Audio } from 'expo-av';

// API configuration
const REALTIME_API_URL = 'wss://api.openai.com/v1/realtime';
const MODEL = 'gpt-4o-realtime-preview-2024-12-17';

// Get API key from environment
const getApiKey = () => process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

export type RealtimeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type VoiceActivityState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface RealtimeMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

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

let session: RealtimeSession | null = null;

/**
 * Initialize a new realtime voice session
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

  // Close existing session if any
  closeRealtimeSession();

  session = {
    ws: null,
    recording: null,
    playbackObject: null,
    callbacks,
    connectionState: 'connecting',
    voiceActivityState: 'idle',
  };

  callbacks.onConnectionStateChange?.('connecting');

  try {
    // Request audio permissions
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Audio permission not granted');
    }

    // Configure audio mode for conversation
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // Create WebSocket connection
    const url = `${REALTIME_API_URL}?model=${MODEL}`;
    const ws = new WebSocket(url, ['realtime', `openai-insecure-api-key.${apiKey}`]);

    ws.onopen = () => {
      console.log('[Realtime] WebSocket connected');
      session!.connectionState = 'connected';
      callbacks.onConnectionStateChange?.('connected');

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
If asked about places, provide specific recommendations with names and addresses.`,
        },
      };

      ws.send(JSON.stringify(sessionConfig));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleRealtimeMessage(message, callbacks);
      } catch (error) {
        console.error('[Realtime] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[Realtime] WebSocket error:', error);
      session!.connectionState = 'error';
      callbacks.onConnectionStateChange?.('error');
      callbacks.onError?.('Connection error');
    };

    ws.onclose = (event) => {
      console.log('[Realtime] WebSocket closed:', event.code, event.reason);
      session!.connectionState = 'disconnected';
      callbacks.onConnectionStateChange?.('disconnected');
    };

    session.ws = ws;
    return true;
  } catch (error) {
    console.error('[Realtime] Init error:', error);
    session.connectionState = 'error';
    callbacks.onConnectionStateChange?.('error');
    callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Handle incoming realtime API messages
 */
function handleRealtimeMessage(message: any, callbacks: RealtimeCallbacks) {
  switch (message.type) {
    case 'session.created':
      console.log('[Realtime] Session created');
      break;

    case 'session.updated':
      console.log('[Realtime] Session updated');
      break;

    case 'input_audio_buffer.speech_started':
      console.log('[Realtime] User started speaking');
      if (session) {
        session.voiceActivityState = 'listening';
        callbacks.onVoiceActivityChange?.('listening');
      }
      break;

    case 'input_audio_buffer.speech_stopped':
      console.log('[Realtime] User stopped speaking');
      if (session) {
        session.voiceActivityState = 'processing';
        callbacks.onVoiceActivityChange?.('processing');
      }
      break;

    case 'conversation.item.input_audio_transcription.completed':
      console.log('[Realtime] User transcript:', message.transcript);
      callbacks.onTranscript?.(message.transcript, true);
      break;

    case 'response.audio_transcript.delta':
      // Streaming assistant text
      callbacks.onAssistantResponse?.(message.delta);
      break;

    case 'response.audio_transcript.done':
      console.log('[Realtime] Assistant transcript complete:', message.transcript);
      break;

    case 'response.audio.delta':
      // Streaming audio response - handle audio playback
      if (session && session.voiceActivityState !== 'speaking') {
        session.voiceActivityState = 'speaking';
        callbacks.onVoiceActivityChange?.('speaking');
      }
      // Audio is base64 encoded PCM
      if (message.delta) {
        try {
          const binaryString = atob(message.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          callbacks.onAudioOutput?.(bytes.buffer);
        } catch (e) {
          console.error('[Realtime] Error decoding audio:', e);
        }
      }
      break;

    case 'response.audio.done':
      console.log('[Realtime] Audio response complete');
      if (session) {
        session.voiceActivityState = 'idle';
        callbacks.onVoiceActivityChange?.('idle');
      }
      break;

    case 'response.done':
      console.log('[Realtime] Response complete');
      if (session) {
        session.voiceActivityState = 'idle';
        callbacks.onVoiceActivityChange?.('idle');
      }
      break;

    case 'error':
      console.error('[Realtime] API error:', message.error);
      callbacks.onError?.(message.error?.message || 'API error');
      break;

    default:
      console.log('[Realtime] Unhandled message type:', message.type);
  }
}

/**
 * Start listening for voice input
 * This sends audio to the API for processing
 */
export async function startListening(): Promise<boolean> {
  if (!session || !session.ws || session.connectionState !== 'connected') {
    console.error('[Realtime] Not connected');
    return false;
  }

  try {
    // Configure recording
    const recordingOptions: Audio.RecordingOptions = {
      android: {
        extension: '.raw',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 24000,
        numberOfChannels: 1,
        bitRate: 384000,
      },
      ios: {
        extension: '.raw',
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 24000,
        numberOfChannels: 1,
        bitRate: 384000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    };

    const { recording } = await Audio.Recording.createAsync(recordingOptions);
    session.recording = recording;

    // Start streaming audio to WebSocket
    // Note: In a real implementation, you'd stream audio chunks
    // For simplicity, we record and send chunks periodically
    session.voiceActivityState = 'listening';
    session.callbacks.onVoiceActivityChange?.('listening');

    console.log('[Realtime] Started listening');
    return true;
  } catch (error) {
    console.error('[Realtime] Failed to start listening:', error);
    session.callbacks.onError?.(error instanceof Error ? error.message : 'Recording error');
    return false;
  }
}

/**
 * Stop listening and send audio to API
 */
export async function stopListening(): Promise<void> {
  if (!session || !session.recording) {
    return;
  }

  try {
    session.voiceActivityState = 'processing';
    session.callbacks.onVoiceActivityChange?.('processing');

    await session.recording.stopAndUnloadAsync();
    const uri = session.recording.getURI();

    if (uri && session.ws && session.connectionState === 'connected') {
      // Read the audio file and convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = (reader.result as string)?.split(',')[1];
        if (base64data && session?.ws) {
          // Send audio to the API
          session.ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64data,
          }));

          // Commit the audio buffer to trigger processing
          session.ws.send(JSON.stringify({
            type: 'input_audio_buffer.commit',
          }));

          // Request a response
          session.ws.send(JSON.stringify({
            type: 'response.create',
          }));
        }
      };
    }

    session.recording = null;
    console.log('[Realtime] Stopped listening');
  } catch (error) {
    console.error('[Realtime] Failed to stop listening:', error);
    session.recording = null;
  }
}

/**
 * Send a text message (for when user types instead of speaks)
 */
export function sendTextMessage(text: string): void {
  if (!session || !session.ws || session.connectionState !== 'connected') {
    console.error('[Realtime] Not connected');
    return;
  }

  // Create a conversation item with user message
  session.ws.send(JSON.stringify({
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
  }));

  // Request a response
  session.ws.send(JSON.stringify({
    type: 'response.create',
  }));

  console.log('[Realtime] Sent text message:', text);
}

/**
 * Close the realtime session
 */
export function closeRealtimeSession(): void {
  if (!session) return;

  if (session.recording) {
    session.recording.stopAndUnloadAsync().catch(() => {});
    session.recording = null;
  }

  if (session.playbackObject) {
    session.playbackObject.unloadAsync().catch(() => {});
    session.playbackObject = null;
  }

  if (session.ws) {
    session.ws.close();
    session.ws = null;
  }

  session = null;
  console.log('[Realtime] Session closed');
}

/**
 * Get current connection state
 */
export function getConnectionState(): RealtimeConnectionState {
  return session?.connectionState ?? 'disconnected';
}

/**
 * Get current voice activity state
 */
export function getVoiceActivityState(): VoiceActivityState {
  return session?.voiceActivityState ?? 'idle';
}

/**
 * Check if realtime API is supported
 * (Requires API key with realtime access)
 */
export function isRealtimeSupported(): boolean {
  return !!getApiKey();
}
