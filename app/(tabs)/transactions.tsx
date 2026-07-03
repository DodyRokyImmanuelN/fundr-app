import { Text, View } from 'react-native';

export default function TransactionsScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>Transactions</Text>
      <Text style={{ marginTop: 8 }}>
        Transaction history will be implemented in Sprint 3.
      </Text>
    </View>
  );
}