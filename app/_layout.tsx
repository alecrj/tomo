import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
        <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="navigation" options={{ animation: 'fade' }} />
        <Stack.Screen name="voice" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="memory" />
        <Stack.Screen name="trip-recap" />
        <Stack.Screen name="itinerary" />
        <Stack.Screen name="destination" options={{ presentation: 'modal' }} />
        <Stack.Screen name="conversations" options={{ presentation: 'modal' }} />
        <Stack.Screen name="companion" />
      </Stack>
    </SafeAreaProvider>
  );
}
