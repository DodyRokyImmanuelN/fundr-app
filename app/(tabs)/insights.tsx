import { Text, View } from 'react-native';

export default function InsightsScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>Insights</Text>
      <Text style={{ marginTop: 8 }}>
        Rule-based insights will be implemented after transactions.
      </Text>
    </View>
  );
}