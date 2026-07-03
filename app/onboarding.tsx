import { Text, View } from 'react-native';

export default function OnboardingScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>Onboarding</Text>
      <Text style={{ marginTop: 8 }}>
        Onboarding flow will be implemented after database foundation.
      </Text>
    </View>
  );
}