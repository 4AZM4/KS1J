import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

type IconName = SymbolViewProps['name'];

function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  return <SymbolView name={name} tintColor={color} size={26} />;
}

// KS1J has exactly four tabs. New features go inside one of them, never as a fifth tab.
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        // Disable the static render of the header on web to prevent a hydration error.
        headerShown: useClientOnlyValue(false, true),
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
