import { Redirect, Stack, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { migrateDatabase } from '../src/db/migrations';
import { seedDatabase } from '../src/db/seed';
import { getUserSettings } from '../src/features/settings/settings.repository';

export default function RootLayout() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      await migrateDatabase();
      await seedDatabase();

      const settings = await getUserSettings();

      setIsOnboardingCompleted(
        Boolean(settings?.is_onboarding_completed)
      );

      setIsLoading(false);
    }

    loadSettings();
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (!isOnboardingCompleted && pathname !== '/onboarding') {
    return <Redirect href="/onboarding" />;
  }

  if (isOnboardingCompleted && pathname === '/onboarding') {
    return <Redirect href="/" />;
  }

  return (
  <Stack>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="onboarding" options={{ title: 'Onboarding' }} />
    <Stack.Screen
      name="income-confirmation"
      options={{ title: 'Income Confirmation' }}
    />
    <Stack.Screen
      name="add-transaction"
      options={{ title: 'Add Transaction' }}
    />
    <Stack.Screen name="add-money" options={{ title: 'Add Money' }} />
    <Stack.Screen name="adjust-balance" options={{ title: 'Adjust Balance' }} />
    <Stack.Screen name="add-envelope" options={{ title: 'Add Envelope' }} />
    <Stack.Screen
      name="decision-assistant"
      options={{ title: 'Decision Assistant' }}
    />
    <Stack.Screen name="cycle-review" options={{ title: 'Cycle Review' }} />
  </Stack>
);
}
