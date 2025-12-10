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
 * Transcribe audio using Whisper API (placeholder - requires backend)
 * For now, we'll just return a placeholder message
 */
export async function transcribeAudio(audioUri: string): Promise<string | null> {
  try {
    // TODO: Implement actual transcription
    // This would require sending the audio file to a backend that calls OpenAI Whisper API
    // or using Expo's speech recognition capabilities

    console.log('[Voice] Transcription not yet implemented for:', audioUri);
    return '[Voice message recorded - transcription coming soon]';
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
}
