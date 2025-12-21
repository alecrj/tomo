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

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Stop recording and get audio URI
 */
export async function stopRecording(): Promise<string | null> {
  try {
    if (!recording) {
      return null;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;

    return uri;
  } catch (error) {
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
    }
  } catch (error) {
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
      // Return a placeholder so the user knows voice worked but transcription isn't available
      return null;
    }


    // Create form data for the audio file
    // Note: Don't set Content-Type header - let fetch auto-generate with boundary
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await fetch(`${backendUrl}/transcribe`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - React Native fetch will auto-set with correct boundary
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    return null;
  }
}
