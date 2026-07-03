import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../../constants/theme';

type ProgressBarProps = {
  percentage: number;
};

export function ProgressBar({ percentage }: ProgressBarProps) {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const fillWidth = `${clampedPercentage}%` as `${number}%`;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: fillWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
});