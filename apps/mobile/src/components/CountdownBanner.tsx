import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  remaining: string;
}

export function CountdownBanner({ remaining }: Props) {
  return (
    <View style={styles.deadlineCompact}>
      <Text style={styles.deadlineIcon}>⌛</Text>
      <Text style={styles.deadlineLabelCompact}>Registration closes in</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.deadlineTimeCompact}>{remaining}</Text>
      <Text style={styles.hurryCompact}>◷ Hurry up!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  deadlineCompact: { minHeight: 48, marginTop: 10, backgroundColor: '#EAF8F8', borderRadius: 11, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 6 },
  deadlineIcon: { color: '#078B92', fontSize: 19 },
  deadlineLabelCompact: { color: '#122448', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  deadlineTimeCompact: { color: '#078B92', fontSize: 14, fontWeight: '800', marginLeft: 'auto', flexShrink: 1 },
  hurryCompact: { color: '#078B92', fontSize: 11, fontWeight: '800', flexShrink: 0 }
});
