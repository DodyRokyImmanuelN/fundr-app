import { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '../../constants/theme';

type CardProps = {
  children: ReactNode;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, muted, style }: CardProps) {
  return (
    <View style={[styles.card, muted ? styles.muted : undefined, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
});
