import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/theme';

type OptionRowProps = {
  title: string;
  meta?: string;
  selected?: boolean;
  trailing?: ReactNode;
  onPress: () => void;
};

export function OptionRow({ title, meta, selected, trailing, onPress }: OptionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.rowSelected : undefined,
        pressed ? styles.rowPressed : undefined,
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, selected ? styles.titleSelected : undefined]}>
          {title}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  rowPressed: {
    backgroundColor: colors.surfacePressed,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: typography.body,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  titleSelected: {
    color: colors.primary,
  },
  meta: {
    marginTop: 2,
    fontSize: typography.small,
    color: colors.textSecondary,
  },
});
