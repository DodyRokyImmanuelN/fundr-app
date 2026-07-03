import { Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>Settings</Text>
      <Text style={{ marginTop: 8 }}>
        Account, income, and category settings will be implemented later.
      </Text>
    </View>
  );
}