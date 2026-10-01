import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/lib/auth';
import { LanguageProvider } from '@/lib/i18n';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <LanguageProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerTitleStyle: { fontSize: 18 }, headerBackTitle: 'Back' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Sign in', headerBackVisible: false }} />
          <Stack.Screen name="signup" options={{ title: 'Create an account' }} />
          <Stack.Screen name="apply" options={{ title: 'Apply for help' }} />
          <Stack.Screen name="applications" options={{ title: 'My applications' }} />
          <Stack.Screen name="case-docs" options={{ title: 'Documents' }} />
          <Stack.Screen name="cases/[category]" options={{ title: 'Support a case' }} />
          <Stack.Screen name="case/[id]" options={{ title: 'Case' }} />
          <Stack.Screen name="loan" options={{ title: 'Education loan' }} />
          <Stack.Screen name="loan-hardship" options={{ title: 'Pause or lower EMI' }} />
          <Stack.Screen name="khums" options={{ title: 'Khums' }} />
          <Stack.Screen name="khums-imam" options={{ title: 'Pay Sehme Imam' }} />
          <Stack.Screen name="lawajam" options={{ title: 'Lawajam' }} />
          <Stack.Screen name="helpdesk" options={{ title: 'Helpdesk' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
          <Stack.Screen name="receipt" options={{ title: 'Receipt' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'About' }} />
        </Stack>
      </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
