import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface Props {
  judge: { name: string; role: string; experience: string; image: string };
}

export function JudgeCard({ judge }: Props) {
  return (
    <View style={styles.judgeCard}>
      <Image source={{ uri: judge.image }} style={styles.judgeImage} />
      <View style={styles.judgeCopy}>
        <Text style={styles.judgeLabel}>Judge</Text>
        <Text style={styles.judgeName}>{judge.name}</Text>
        <Text style={styles.judgeRole}>{judge.role}</Text>
        <Text style={styles.judgeRole}>{judge.experience}</Text>
      </View>
      <View style={styles.videoButton}>
        <Text style={styles.play}>▶</Text>
        <Text style={styles.videoLabel}>Intro Video</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  judgeCard: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E8EEF0', marginTop: 10, padding: 12, flexDirection: 'row', alignItems: 'center' },
  judgeImage: { width: 74, height: 74, borderRadius: 40, marginRight: 14 },
  judgeCopy: { flex: 1 },
  judgeLabel: { color: '#637292', fontSize: 12 },
  judgeName: { color: '#122448', fontSize: 16, fontWeight: '800', marginVertical: 2 },
  judgeRole: { color: '#637292', fontSize: 11, marginTop: 2 },
  videoButton: { alignItems: 'center', paddingHorizontal: 8 },
  play: { width: 46, height: 46, borderRadius: 30, backgroundColor: '#E9F8FA', color: '#078B92', textAlign: 'center', paddingTop: 13, paddingLeft: 3, fontSize: 18 },
  videoLabel: { color: '#637292', fontSize: 11, marginTop: 5 }
});
