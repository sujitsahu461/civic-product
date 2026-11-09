import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Card, Empty, ErrorText, Screen, Sub, Title, confirmAction, notify } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { colors, formatDateTime } from '../theme';
import { deleteDraft, Draft, listDrafts, saveDraft } from '../drafts';
import type { ApiError } from '../api/client';

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
      const ok = await confirmAction('Send anyway?', 'This report may already have reached the server. Check "My complaints" first. Sending again could create a duplicate.', 'Send anyway');
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
      <Title>Saved drafts</Title>
      <Sub>Reports that could not be sent are kept here until the server confirms them.</Sub>
      <ErrorText>{error}</ErrorText>
      {drafts.length === 0 && <Empty title="No drafts" />}
      {drafts.map((d) => (
        <Card key={d.id}>
          <Text style={{ fontWeight: '700', color: colors.ink }}>{d.data.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>{d.data.description}</Text>
          <Text style={{ fontSize: 11, color: d.state === 'UNKNOWN' ? colors.danger : colors.muted }}>
            {d.state === 'UNKNOWN' ? 'Not confirmed: check My complaints first. ' : d.state === 'FAILED' ? 'Failed: ' : ''}{d.note} · {formatDateTime(d.updatedAt)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button title="Send" onPress={() => send(d)} busy={busyId === d.id} /></View>
            <View style={{ flex: 1 }}><Button kind="secondary" title="Delete" onPress={() => remove(d)} /></View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
