import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors, radius } from '../../src/constants/theme';

type TabIconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  name,
  color,
  size,
}: {
  name: TabIconName;
  color: string;
  size: number;
}) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          minHeight: 62,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
        tabBarItemStyle: {
          borderRadius: radius.md,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: (props) => <TabIcon name="grid-outline" {...props} />,
        }}
      />
      <Tabs.Screen
        name="envelopes"
        options={{
          title: 'Envelopes',
          tabBarIcon: (props) => (
            <TabIcon name="file-tray-stacked-outline" {...props} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: (props) => (
            <TabIcon name="swap-vertical-outline" {...props} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: (props) => <TabIcon name="analytics-outline" {...props} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: (props) => <TabIcon name="settings-outline" {...props} />,
        }}
      />
    </Tabs>
  );
}
