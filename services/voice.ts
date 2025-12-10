import { Audio } from 'expo-av';

let recording: Audio.Recording | null = null;

/**
 * Request audio permissions
 */
export async function requestAudioPermission(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting audio permission:', error);
    return false;
  }
}

/**
 * Start recording audio
 */
export async function startRecording(): Promise<boolean> {
  try {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      console.log('Audio permission denied');
      return false;
    }

    // Set audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();

    console.log('[Voice] Recording started');
    return true;
  } catch (error) {
    console.error('Error starting recording:', error);
    return false;
  }
}

/**
 * Stop recording and get audio URI
 */
export async function stopRecording(): Promise<string | null> {
  try {
    if (!recording) {
      console.log('[Voice] No active recording');
      return null;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;

    console.log('[Voice] Recording stopped:', uri);
    return uri;
  } catch (error) {
    console.error('Error stopping recording:', error);
    recording = null;
    return null;
  }
}

/**
 * Cancel recording
 */
export async function cancelRecording(): Promise<void> {
  try {
    if (recording) {
      await recording.stopAndUnloadAsync();
      recording = null;
      console.log('[Voice] Recording canceled');
    }
  } catch (error) {
    console.error('Error canceling recording:', error);
    recording = null;
  }
}

/**
 * Transcribe audio using Whisper API via backend
 */
export async function transcribeAudio(audioUri: string): Promise<string | null> {
  try {
    const backendUrl = process.env.EXPO_PUBLIC_WHISPER_BACKEND_URL;

    if (!backendUrl) {
      console.log('[Voice] No Whisper backend URL configured, using fallback');
      return '[Voice message - configure WHISPER_BACKEND_URL for transcription]';
    }

    console.log('[Voice] Transcribing audio:', audioUri);

    // Create form data for the audio file
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await fetch(`${backendUrl}/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Voice] Transcription failed:', response.status, errorData);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Voice] Transcription result:', data.text);
    return data.text;
  } catch (error) {
    console.error('[Voice] Transcription error:', error);
    return null;
  }
}
