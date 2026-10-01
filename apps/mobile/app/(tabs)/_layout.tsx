import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import type { IconName } from '@ks1j/shared';

import Colors from '@/constants/Colors';
import { Icon } from '@/components/Icon';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';

// Tabler icons, the same set as the website and the pitch deck.
function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <Icon name={name} color={color} size={26} strokeWidth={2} />;
}

// KS1J has exactly four tabs. New features go inside one of them, never as a fifth tab.
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { loading, session } = useAuth();
  const clientOnlyHeader = useClientOnlyValue(false, true);
  const { t } = useT();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        // Elder-friendly: larger labels, and inactive tabs dark enough to read (WCAG AA contrast).
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].mutedText,
        tabBarLabelStyle: { fontSize: 15, fontWeight: '600' },
        tabBarStyle: { height: 72, paddingTop: 6, paddingBottom: 10 },
        // Disable the static render of the header on web to prevent a hydration error.
        headerShown: clientOnlyHeader,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home'),
          tabBarIcon: ({ color }) => (
            <TabIcon name="home" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: t('tab.services'),
          tabBarIcon: ({ color }) => (
            <TabIcon name="lifebuoy" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="give"
        options={{
          title: t('tab.give'),
          tabBarIcon: ({ color }) => (
            <TabIcon name="heart-handshake" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: t('tab.learn'),
          tabBarIcon: ({ color }) => (
            <TabIcon name="book" color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
