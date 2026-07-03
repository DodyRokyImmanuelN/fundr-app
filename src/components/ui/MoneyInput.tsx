import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';

type MoneyInputProps = TextInputProps;

export function MoneyInput(props: MoneyInputProps) {
  return (
    <TextInput
      keyboardType="number-pad"
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
});
