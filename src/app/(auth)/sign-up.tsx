import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
      return;
    }
    // Local Supabase auto-confirms by default (config.toml: enable_confirmations = false),
    // so signUp returns a live session and the onAuthStateChange listener picks it up.
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <View className="flex-1 justify-center gap-6 px-6">
          <View className="gap-2">
            <Text className="text-4xl font-bold text-zinc-900 dark:text-white">
              Create account
            </Text>
            <Text className="text-base text-zinc-500 dark:text-zinc-400">
              Log lifts, get real feedback.
            </Text>
          </View>

          <View className="gap-4">
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="8+ characters"
            />
          </View>

          <Button label="Create account" onPress={onSubmit} loading={loading} />

          <View className="flex-row justify-center gap-1.5">
            <Text className="text-zinc-500 dark:text-zinc-400">Have an account?</Text>
            <Link href="/(auth)/sign-in" className="font-semibold text-brand-500">
              Sign in
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
