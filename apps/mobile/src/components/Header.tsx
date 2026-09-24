import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface HeaderProps {
  language: 'ENG' | 'हिंदी';
  onToggleLanguage?: (lang: 'ENG' | 'हिंदी') => void;
}

export function Header({ language }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.back}>‹</Text>
      <Text style={styles.backLabel}>Go back</Text>
      <View style={styles.language}>
        <Text style={[styles.langPill, language === 'ENG' && styles.activeLang]}>ENG</Text>
        <Text style={[styles.langPill, language === 'हिंदी' && styles.activeLang]}>हिंदी</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  back: { color: '#13284A', fontSize: 34, lineHeight: 30 },
  backLabel: { color: '#13284A', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  language: { marginLeft: 'auto', flexDirection: 'row', borderRadius: 20, backgroundColor: '#F0F2F4', overflow: 'hidden' },
  langPill: { paddingHorizontal: 13, paddingVertical: 9, fontSize: 11, color: '#33446A' },
  activeLang: { color: '#FFF', backgroundColor: '#078B92', fontWeight: '800' }
});
