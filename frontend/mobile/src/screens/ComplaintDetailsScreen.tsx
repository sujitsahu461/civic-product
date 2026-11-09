import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { Button, Card, ErrorText, Field, IconBubble, Loading, Screen, ScreenHeader, SectionTitle, StatusBadge, notify } from '../components/ui';
import type { IconName } from '../components/brand';
import { useSession } from '../state/SessionContext';
import { brand, fonts } from '../brand';
import { categoryMeta, colors, formatDateTime, priorityLabel } from '../theme';
import type { ComplaintDetail, HistoryEntry } from '../api/types';

const abs = (u?: string) => (!u ? '' : u.startsWith('http') ? u : `${API_URL}${u}`);
const sentence = (t: string) => t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/** Vertical progress line, newest step highlighted. */
export function Timeline({ entries }: { entries: HistoryEntry[] }) {
  if (!entries.length) return <Text style={s.muted}>No updates yet.</Text>;
  const last = entries.length - 1;
  return (
    <View>
      {entries.map((h, i) => (
        <View key={h.public_id} style={s.tlRow}>
          <View style={s.tlRail}>
            <View style={[s.tlDot, i === last && s.tlDotNow]} />
            {i < last && <View style={s.tlLine} />}
          </View>
          <View style={s.tlBody}>
            <Text style={s.tlTitle}>
              {sentence(h.action)}
              {h.new_status && h.old_status !== h.new_status ? `: ${h.new_status.replace(/_/g, ' ').toLowerCase()}` : ''}
            </Text>
            {!!h.remarks && <Text style={s.tlText}>{h.remarks}</Text>}
            <Text style={s.tlTime}>{formatDateTime(h.created_at)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={s.metaRow}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={s.metaText}>{text}</Text>
    </View>
  );
}

export function ComplaintView({ c, timeline, onChanged }: { c: ComplaintDetail; timeline: HistoryEntry[]; onChanged?: () => void }) {
  const { api, user } = useSession();
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = !!user && !c.evidence_hidden;
  const canRate = mine && ['RESOLVED', 'CLOSED'].includes(c.status) && !c.feedback;
  const photos = [...(c.images ?? []).map((i) => i.image), ...(c.attachments ?? []).filter((a) => a.attachment_type === 'IMAGE').map((a) => a.file)]
    .filter(Boolean) as string[];
  const icon = (categoryMeta[c.category]?.icon ?? 'document-text-outline') as IconName;

  const sendRating = async () => {
    if (!rating) return setError('Choose a star rating.');
    setBusy(true);
    setError(null);
    try {
      await api.submitFeedback(c.public_id, rating, comments.trim(), true);
      notify('Thank you', 'Your rating was saved.');
      onChanged?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <View style={s.topRow}>
          <View style={s.codePill}>
            <Ionicons name="pricetag-outline" size={13} color={colors.maroon} />
            <Text style={s.code} selectable>{c.tracking_code}</Text>
          </View>
          <StatusBadge status={c.status} />
        </View>
        <View style={s.titleRow}>
          <IconBubble icon={icon} size={44} tint={brand.kesariSoft} color={colors.kesari} />
          <Text style={s.title}>{c.title}</Text>
        </View>
        <Text style={s.desc}>{c.description}</Text>
        <View style={s.metaBox}>
          <Meta icon="grid-outline" text={c.category_display} />
          <Meta icon="flag-outline" text={`Priority: ${priorityLabel[c.priority] ?? c.priority}`} />
          {!!c.location_address && <Meta icon="location-outline" text={c.location_address} />}
          <Meta icon="calendar-outline" text={`Filed ${formatDateTime(c.created_at)}`} />
        </View>
      </Card>

      {c.evidence_hidden && (
        <Text style={s.muted}>Photos are visible only to the person who filed the complaint.</Text>
      )}
      {photos.length > 0 && (
        <ScrollView overScrollMode="never" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {photos.map((p) => <Image key={p} source={{ uri: abs(p) }} style={s.photo} />)}
        </ScrollView>
      )}

      {!!c.resolution_notes && (
        <View style={s.resolved}>
          <IconBubble icon="checkmark-done-outline" size={38} tint="#FFFFFF" color={colors.ok} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.resolvedTitle}>{['RESOLVED', 'CLOSED'].includes(c.status) ? 'What was done' : 'Note from the officers'}</Text>
            <Text style={s.resolvedText}>{c.resolution_notes}</Text>
          </View>
        </View>
      )}

      <SectionTitle>Progress</SectionTitle>
      <Card>
        <Timeline entries={timeline} />
      </Card>

      {c.feedback && (
        <View style={s.rated}>
          <Text style={s.starsBig}>{'★'.repeat(c.feedback.rating)}<Text style={{ color: '#E4DCCB' }}>{'★'.repeat(5 - c.feedback.rating)}</Text></Text>
          <Text style={s.muted}>Your rating{c.feedback.comments ? `: "${c.feedback.comments}"` : ''}</Text>
        </View>
      )}
      {canRate && (
        <Card>
          <Text style={s.rateTitle}>How did we do?</Text>
          <Text style={s.muted}>Rate how well this problem was fixed.</Text>
          <View style={s.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} stars`} accessibilityState={{ selected: n <= rating }} onPress={() => setRating(n)} hitSlop={4}>
                <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color={n <= rating ? colors.haldi : '#D0C6B4'} />
              </Pressable>
            ))}
          </View>
          <Field label="Comments (optional)" value={comments} onChangeText={setComments} multiline placeholder="Anything the officers should know" />
          <ErrorText>{error}</ErrorText>
          <Button title="Submit rating" icon="star" onPress={sendRating} busy={busy} />
        </Card>
      )}
    </>
  );
}

export function ComplaintDetailsScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { api } = useSession();
  const [c, setC] = useState<ComplaintDetail | null>(null);
  const [timeline, setTimeline] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const id = route.params.publicId as string;
      const [d, t] = await Promise.all([api.complaint(id), api.timeline(id)]);
      setC(d); setTimeline(t); setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, route.params.publicId]);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen>
      <ScreenHeader title="Complaint" subtitle="Details and progress" onBack={() => nav.goBack()} />
      <ErrorText>{error}</ErrorText>
      {!c && !error && <Loading />}
      {c && <ComplaintView c={c} timeline={timeline} onChanged={load} />}
    </Screen>
  );
}

const s = StyleSheet.create({
  muted: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: brand.blush, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  code: { fontFamily: fonts.bold, fontSize: 12, color: colors.maroon, letterSpacing: 0.3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.ink },
  desc: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  metaBox: { gap: 6, backgroundColor: colors.bg, borderRadius: 14, padding: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  photo: { width: 110, height: 110, borderRadius: 16 },
  resolved: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#E3F4E8', borderRadius: 20, borderWidth: 1, borderColor: '#B7DEC3', padding: 14 },
  resolvedTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ok },
  resolvedText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { alignItems: 'center', width: 14 },
  tlDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: '#D9CBB5', marginTop: 4 },
  tlDotNow: { borderColor: colors.kesari, backgroundColor: colors.kesari, boxShadow: '0px 0px 0px 4px rgba(217, 101, 11, 0.18)' },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 2 },
  tlBody: { flex: 1, paddingBottom: 14 },
  tlTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  tlText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  tlTime: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
  rated: { alignItems: 'center', gap: 2 },
  starsBig: { fontSize: 26, color: colors.haldi, letterSpacing: 2 },
  rateTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  stars: { flexDirection: 'row', gap: 8, marginVertical: 4 },
});
