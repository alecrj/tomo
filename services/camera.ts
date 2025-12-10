import * as ImagePicker from 'expo-image-picker';

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
}

/**
 * Request photo library permissions
 */
export async function requestLibraryPermission(): Promise<boolean> {
  try {
    const { status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting library permission:', error);
    return false;
  }
}

/**
 * Take a photo with the camera
 */
export async function takePhoto(): Promise<string | null> {
  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      console.log('Camera permission denied');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7, // Compress for faster upload
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      return result.assets[0].base64;
    }

    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
}

/**
 * Pick a photo from library
 */
export async function pickPhoto(): Promise<string | null> {
  try {
    const hasPermission = await requestLibraryPermission();
    if (!hasPermission) {
      console.log('Library permission denied');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      return result.assets[0].base64;
    }

    return null;
  } catch (error) {
    console.error('Error picking photo:', error);
    return null;
  }
}
