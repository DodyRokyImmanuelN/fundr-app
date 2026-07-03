import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../src/constants/theme';
import { completeOnboarding } from '../src/features/onboarding/onboarding.service';

type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'irregular';

function parseMoney(value: string) {
  const numericValue = value.replace(/[^0-9]/g, '');
  return Number(numericValue || 0);
}

export default function OnboardingScreen() {
  const [userName, setUserName] = useState('Dody');
  const [currency] = useState('IDR');

  const [spendingAccountName, setSpendingAccountName] = useState('');
  const [savingAccountName, setSavingAccountName] = useState('');

  const [incomeName, setIncomeName] = useState('Main Income');
  const [incomeAmount, setIncomeAmount] = useState('850000');
  const [incomeFrequency, setIncomeFrequency] = useState<Frequency>('weekly');
  const [savingAmount, setSavingAmount] = useState('350000');

  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    try {
      setIsSaving(true);

      await completeOnboarding({
        userName,
        currency,
        spendingAccountName,
        savingAccountName,
        incomeName,
        incomeAmount: parseMoney(incomeAmount),
        incomeFrequency,
        savingAmount: parseMoney(savingAmount),
      });

      router.replace('/');
    } catch (error) {
      Alert.alert(
        'Onboarding Error',
        error instanceof Error ? error.message : 'Something went wrong'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.appName}>Fundr</Text>
          <Text style={styles.title}>Set up your money system</Text>
          <Text style={styles.subtitle}>
            Create your first accounts, income source, and budget cycle.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <Text style={styles.label}>Your name</Text>
          <TextInput
            value={userName}
            onChangeText={setUserName}
            placeholder="e.g. Dody"
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Accounts</Text>

          <Text style={styles.label}>Daily spending account</Text>
          <TextInput
            value={spendingAccountName}
            onChangeText={setSpendingAccountName}
            placeholder="e.g. BCA, Mandiri, GoPay, Cash"
            style={styles.input}
          />

          <Text style={styles.label}>Saving / protected account</Text>
          <TextInput
            value={savingAccountName}
            onChangeText={setSavingAccountName}
            placeholder="e.g. SeaBank, Jago, Savings"
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Income</Text>

          <Text style={styles.label}>Income name</Text>
          <TextInput
            value={incomeName}
            onChangeText={setIncomeName}
            placeholder="e.g. Weekly allowance, salary, freelance"
            style={styles.input}
          />

          <Text style={styles.label}>Income amount</Text>
          <TextInput
            value={incomeAmount}
            onChangeText={setIncomeAmount}
            keyboardType="number-pad"
            placeholder="850000"
            style={styles.input}
          />

          <Text style={styles.label}>Income frequency</Text>
          <View style={styles.frequencyGrid}>
            {(['weekly', 'biweekly', 'monthly', 'irregular'] as Frequency[]).map(
              (frequency) => (
                <Pressable
                  key={frequency}
                  onPress={() => setIncomeFrequency(frequency)}
                  style={[
                    styles.frequencyButton,
                    incomeFrequency === frequency &&
                      styles.frequencyButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      incomeFrequency === frequency &&
                        styles.frequencyTextActive,
                    ]}
                  >
                    {frequency}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Allocation</Text>

          <Text style={styles.label}>Amount to protect / save</Text>
          <TextInput
            value={savingAmount}
            onChangeText={setSavingAmount}
            keyboardType="number-pad"
            placeholder="350000"
            style={styles.input}
          />

          <Text style={styles.helperText}>
            The remaining income will become flexible money for your current
            budget cycle.
          </Text>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={isSaving}
          style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
        >
          <Text style={styles.submitButtonText}>
            {isSaving ? 'Creating Fundr...' : 'Create My Budget'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.xl,
    paddingTop: spacing['3xl'],
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  appName: {
    fontSize: typography.title,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.subheading,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  helperText: {
    fontSize: typography.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  frequencyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  frequencyButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  frequencyText: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  frequencyTextActive: {
    color: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '800',
  },
});