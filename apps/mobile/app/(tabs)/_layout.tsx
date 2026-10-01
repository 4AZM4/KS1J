import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View, type ColorValue } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '@/lib/auth';

type IconName = SymbolViewProps['name'];

function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  return <SymbolView name={name} tintColor={color} size={26} />;
}

// KS1J has exactly four tabs. New features go inside one of them, never as a fifth tab.
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { loading, session } = useAuth();
  const clientOnlyHeader = useClientOnlyValue(false, true);

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
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'house.fill', android: 'home', web: 'home' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'hands.sparkles.fill', android: 'volunteer_activism', web: 'volunteer_activism' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="give"
        options={{
          title: 'Give',
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => (
            <TabIcon name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
