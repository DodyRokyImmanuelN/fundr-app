import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="envelopes"
        options={{
          title: 'Envelopes',
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}