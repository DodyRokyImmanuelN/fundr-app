import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, layout } from '../../constants/theme';

type ScreenProps = {
  children: ReactNode;
};

export function Screen({ children }: ScreenProps) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: layout.screenPadding,
    paddingTop: layout.screenTopPadding,
    gap: layout.sectionGap,
  },
});
