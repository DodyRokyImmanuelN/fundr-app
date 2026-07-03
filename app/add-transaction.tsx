import { Text, View } from 'react-native';

export default function AddTransactionScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>Add Transaction</Text>
      <Text style={{ marginTop: 8 }}>
        Transaction input will be implemented in Sprint 3.
      </Text>
    </View>
  );
}