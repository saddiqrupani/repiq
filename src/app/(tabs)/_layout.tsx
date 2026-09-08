import { Redirect, Tabs } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { ActivityIndicator, useColorScheme, View, type ColorValue } from 'react-native';

import { useUnreadCount } from '@/hooks/useNotifications';
import { useSession } from '@/hooks/useSession';
import { useMyProfile } from '@/hooks/useSocial';

function tabIcon(name: SFSymbol) {
  return ({ color }: { color: ColorValue }) => (
    <SymbolView name={name} tintColor={color as string} size={26} type="hierarchical" />
  );
}

export default function TabsLayout() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const { session, loading } = useSession();
  const profile = useMyProfile();
  const unread = useUnreadCount();

  if (loading || (session && profile.isPending)) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!profile.data?.home_gym_id) return <Redirect href="/onboarding/gym" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: dark ? '#71717a' : '#a1a1aa',
        tabBarStyle: {
          backgroundColor: dark ? '#000' : '#fff',
          borderTopColor: dark ? '#27272a' : '#e4e4e7',
        },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Feed', tabBarIcon: tabIcon('house.fill') }} />
      <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: tabIcon('dumbbell.fill') }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: tabIcon('bell.fill'),
          tabBarBadge: unread.data && unread.data > 0 ? unread.data : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person.crop.circle.fill') }}
      />
    </Tabs>
  );
}
