import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FormScreen } from '../src/components/layout/FormScreen';
import { PageHeader } from '../src/components/layout/PageHeader';
import { AppButton } from '../src/components/ui/AppButton';
import { Card } from '../src/components/ui/Card';
import { MoneyInput } from '../src/components/ui/MoneyInput';
import { SectionHeader } from '../src/components/ui/SectionHeader';
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
    <FormScreen>
      <PageHeader
        title="Fundr"
        subtitle="Set up your first accounts, income source, and budget cycle."
      />

      <Card>
        <SectionHeader title="Profile" />

        <Text style={styles.label}>Your name</Text>
        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder="e.g. Dody"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Card>

      <Card>
        <SectionHeader title="Accounts" />

        <Text style={styles.label}>Daily spending account</Text>
        <TextInput
          value={spendingAccountName}
          onChangeText={setSpendingAccountName}
          placeholder="e.g. BCA, Mandiri, GoPay, Cash"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Saving / protected account</Text>
        <TextInput
          value={savingAccountName}
          onChangeText={setSavingAccountName}
          placeholder="e.g. SeaBank, Jago, Savings"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Card>

      <Card>
        <SectionHeader title="Income" />

        <Text style={styles.label}>Income name</Text>
        <TextInput
          value={incomeName}
          onChangeText={setIncomeName}
          placeholder="e.g. Weekly allowance, salary, freelance"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Income amount</Text>
        <MoneyInput
          value={incomeAmount}
          onChangeText={setIncomeAmount}
          placeholder="850000"
          style={styles.compactMoneyInput}
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
                  incomeFrequency === frequency && styles.frequencyButtonActive,
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
      </Card>

      <Card>
        <SectionHeader title="Allocation" />

        <Text style={styles.label}>Amount to protect / save</Text>
        <MoneyInput
          value={savingAmount}
          onChangeText={setSavingAmount}
          placeholder="350000"
          style={styles.compactMoneyInput}
        />

        <Text style={styles.helperText}>
          The remaining income will become flexible money for your current
          budget cycle.
        </Text>
      </Card>

      <AppButton
        label={isSaving ? 'Creating Fundr...' : 'Create My Budget'}
        onPress={handleSubmit}
        disabled={isSaving}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.small,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  compactMoneyInput: {
    fontSize: typography.heading,
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
    backgroundColor: colors.primaryMuted,
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
});
