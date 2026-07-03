import { Text, View } from 'react-native';

export default function DecisionAssistantScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>
        Decision Assistant
      </Text>
      <Text style={{ marginTop: 8 }}>
        Spending simulation will be implemented later.
      </Text>
    </View>
  );
}