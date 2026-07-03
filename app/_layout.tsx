import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { migrateDatabase } from '../src/db/migrations';
import { seedDatabase } from '../src/db/seed';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function prepareApp() {
      try {
        await migrateDatabase();
        await seedDatabase();
        setIsReady(true);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unknown database initialization error'
        );
      }
    }

    prepareApp();
  }, []);

  if (errorMessage) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
          Database Error
        </Text>
        <Text style={{ textAlign: 'center' }}>{errorMessage}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Preparing Fundr...</Text>
      </View>
    );
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
      <Stack.Screen
        name="decision-assistant"
        options={{ title: 'Decision Assistant' }}
      />
      <Stack.Screen name="cycle-review" options={{ title: 'Cycle Review' }} />
    </Stack>
  );
}