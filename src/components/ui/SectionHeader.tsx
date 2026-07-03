import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../constants/theme';

type SectionHeaderProps = {
  title: string;
  meta?: string;
};

export function SectionHeader({ title, meta }: SectionHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: typography.subheading,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
});
