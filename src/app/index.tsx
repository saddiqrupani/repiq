import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '@/hooks/useSession';
import { useMyProfile } from '@/hooks/useSocial';

export default function Index() {
  const { session, loading } = useSession();
  const profile = useMyProfile();

  if (loading || (session && profile.isPending)) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!profile.data?.home_gym_id) return <Redirect href="/onboarding/gym" />;
  return <Redirect href="/(tabs)/home" />;
}
