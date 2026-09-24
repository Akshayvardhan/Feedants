import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Competition } from '@feedants/shared';

interface Props {
  competition: Competition;
  spotsLeft: number;
}

function money(value: number) { return `₹ ${value.toLocaleString('en-IN')}`; }

export function CompetitionHeaderCard({ competition, spotsLeft }: Props) {
  const progressPercent = Math.min(100, (competition.participantCount / competition.capacity) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{competition.title}</Text>
        <View style={styles.registered}>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.registeredText}>{competition.isRegistered ? 'Registered' : 'Open'}</Text>
        </View>
      </View>

      <View style={styles.tagRow}>
        <View style={styles.tag}><Text style={styles.tagText}>{competition.category}</Text></View>
        <View style={styles.tag}><Text style={styles.tagText}>Multi-Win</Text></View>
        <Text style={styles.trophy}>♕</Text>
        <Text style={styles.certificate}>Winners get certificate</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Prize Pool</Text>
          <Text style={styles.statValue}>{money(competition.prizePool)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Entry Fee</Text>
          <Text style={styles.statValue}>{money(competition.entryFee)}</Text>
        </View>
        <View style={styles.availability}>
          <Text style={styles.statLabel}>♧ Only {spotsLeft} spots left</Text>
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.booked}>{competition.participantCount} / {competition.capacity} Booked</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8EEF0', shadowColor: '#193B53', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#122448', fontSize: 21, fontWeight: '800', flex: 1 },
  registered: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF8F8', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  check: { backgroundColor: '#078B92', color: '#FFF', borderRadius: 10, width: 19, height: 19, textAlign: 'center', marginRight: 5 },
  registeredText: { color: '#087C84', fontSize: 12, fontWeight: '700' },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  tag: { backgroundColor: '#F3F6F8', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 5 },
  tagText: { color: '#223558', fontSize: 11, fontWeight: '700' },
  trophy: { color: '#078B92', fontSize: 24, marginLeft: 4 },
  certificate: { color: '#087C84', fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  stat: { width: '27%' },
  statLabel: { color: '#637292', fontSize: 12, marginBottom: 5 },
  statValue: { color: '#078B92', fontSize: 28, fontWeight: '800' },
  availability: { width: '42%' },
  progress: { height: 5, backgroundColor: '#D8EEEE', borderRadius: 5, marginTop: 7 },
  progressFill: { height: 5, borderRadius: 5, backgroundColor: '#078B92' },
  booked: { color: '#637292', fontSize: 12, marginTop: 7 }
});
