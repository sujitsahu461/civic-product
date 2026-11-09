import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { API_URL } from '../config';
import { Button, Card, ErrorText, Field, Label, Loading, Screen, StatusBadge, Title, notify } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { colors, formatDateTime, priorityLabel } from '../theme';
import type { ComplaintDetail, HistoryEntry } from '../api/types';

const abs = (u?: string) => (!u ? '' : u.startsWith('http') ? u : `${API_URL}${u}`);

export function Timeline({ entries }: { entries: HistoryEntry[] }) {
  return (
    <View style={{ gap: 10 }}>
      {entries.map((h) => (
        <View key={h.public_id} style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.kesari, marginTop: 5 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: colors.ink, fontSize: 13 }}>
              {h.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              {h.new_status && h.old_status !== h.new_status ? `: ${h.new_status.replace(/_/g, ' ').toLowerCase()}` : ''}
            </Text>
            {!!h.remarks && <Text style={{ color: colors.muted, fontSize: 13 }}>{h.remarks}</Text>}
            <Text style={{ color: colors.muted, fontSize: 11 }}>{formatDateTime(h.created_at)}</Text>
          </View>
        </View>
      ))}
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{c.tracking_code}</Text>
        <StatusBadge status={c.status} />
      </View>
      <Title>{c.title}</Title>
      <Card>
        <Text style={{ color: colors.ink, lineHeight: 21 }}>{c.description}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{c.category_display} · Priority {priorityLabel[c.priority] ?? c.priority}</Text>
        {!!c.location_address && <Text style={{ color: colors.muted, fontSize: 12 }}>{c.location_address}</Text>}
        <Text style={{ color: colors.muted, fontSize: 12 }}>Filed {formatDateTime(c.created_at)}</Text>
      </Card>
      {c.evidence_hidden && <Text style={{ color: colors.muted, fontSize: 12 }}>Photos are visible only to the person who filed the complaint.</Text>}
      {photos.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((p) => <Image key={p} source={{ uri: abs(p) }} style={{ width: 100, height: 100, borderRadius: 10 }} />)}
        </View>
      )}
      {!!c.resolution_notes && (
        <Card style={{ backgroundColor: '#E3F4E8' }}>
          <Label>Resolution</Label>
          <Text style={{ color: colors.ink }}>{c.resolution_notes}</Text>
        </Card>
      )}
      <Label>Progress</Label>
      <Card><Timeline entries={timeline} /></Card>
      {c.feedback && <Text style={{ color: colors.haldi, fontSize: 16 }}>{'★'.repeat(c.feedback.rating)} <Text style={{ color: colors.muted, fontSize: 13 }}>Your rating</Text></Text>}
      {canRate && (
        <Card>
          <Label>How did we do?</Label>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} stars`} onPress={() => setRating(n)}>
                <Text style={{ fontSize: 30, color: n <= rating ? colors.haldi : '#D0D5DD' }}>★</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Comments (optional)" value={comments} onChangeText={setComments} multiline />
          <ErrorText>{error}</ErrorText>
          <Button title="Submit rating" onPress={sendRating} busy={busy} />
        </Card>
      )}
    </>
  );
}

export function ComplaintDetailsScreen() {
  const route = useRoute<any>();
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
      <ErrorText>{error}</ErrorText>
      {!c && !error && <Loading />}
      {c && <ComplaintView c={c} timeline={timeline} onChanged={load} />}
    </Screen>
  );
}
