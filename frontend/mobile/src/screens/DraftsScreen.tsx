import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Card, Empty, ErrorText, Notice, Screen, ScreenHeader, confirmAction, notify } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { fonts } from '../brand';
import { colors, formatDateTime } from '../theme';
import { deleteDraft, Draft, listDrafts, saveDraft } from '../drafts';
import type { ApiError } from '../api/client';

const STATE: Record<Draft['state'], { label: string; fg: string; bg: string }> = {
  UNKNOWN: { label: 'Not confirmed', fg: colors.danger, bg: '#FCE8E6' },
  FAILED: { label: 'Failed', fg: '#8A5A00', bg: '#FDF0C4' },
  PENDING: { label: 'Waiting', fg: '#1D4E89', bg: '#E1ECF9' },
};

export function DraftsScreen() {
  const nav = useNavigation<any>();
  const { api, user } = useSession();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => { if (user) setDrafts(await listDrafts(user.public_id)); }, [user]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const send = async (d: Draft) => {
    if (d.state === 'UNKNOWN') {
      const ok = await confirmAction('Send anyway?', 'This report may already have reached the server. Check "My reports" first. Sending again could create a duplicate.', 'Send anyway');
      if (!ok) return;
    }
    setBusyId(d.id);
    setError(null);
    try {
      const created = await api.createComplaint(d.data);
      await deleteDraft(d.id);
      notify('Report sent', `Your tracking code is ${created.tracking_code}.`);
      await load();
      nav.navigate('ComplaintDetails', { publicId: created.public_id });
    } catch (e) {
      const err = e as ApiError;
      if (user) await saveDraft(user.public_id, d.data, err.network ? 'UNKNOWN' : 'FAILED', err.message, d.id);
      setError(err.message);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (d: Draft) => {
    if (await confirmAction('Delete draft?', 'This cannot be undone.', 'Delete')) { await deleteDraft(d.id); load(); }
  };

  return (
    <Screen>
      <ScreenHeader title="Saved drafts" subtitle="Reports kept until the server confirms them" onBack={() => nav.goBack()} />
      {drafts.some((d) => d.state === 'UNKNOWN') && (
        <Notice icon="alert-circle-outline" tone="maroon" text='"Not confirmed" reports may already have arrived. Check My reports before sending them again.' />
      )}
      <ErrorText>{error}</ErrorText>
      {drafts.length === 0 && <Empty icon="cloud-offline-outline" title="No drafts" hint="If a report cannot be sent, it is saved here so nothing is lost." />}
      {drafts.map((d) => {
        const st = STATE[d.state];
        return (
          <Card key={d.id}>
            <View style={s.row}>
              <View style={[s.badge, { backgroundColor: st.bg }]}>
                <Text style={[s.badgeText, { color: st.fg }]}>{st.label}</Text>
              </View>
              <Text style={s.time}>{formatDateTime(d.updatedAt)}</Text>
            </View>
            <Text style={s.title}>{d.data.title}</Text>
            <Text style={s.desc} numberOfLines={2}>{d.data.description}</Text>
            {!!d.note && <Text style={s.note}>{d.note}</Text>}
            <View style={s.actions}>
              <Button title="Send" icon="arrow-forward" onPress={() => send(d)} busy={busyId === d.id} style={{ flex: 1 }} />
              <Button kind="danger" icon="trash-outline" title="Delete" onPress={() => remove(d)} style={{ flex: 1 }} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  desc: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.muted },
  note: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
