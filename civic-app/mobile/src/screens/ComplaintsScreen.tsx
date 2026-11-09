import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Card, Chip, Empty, ErrorText, Loading, Screen, StatusBadge, Title } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { colors, formatDate } from '../theme';
import type { ComplaintSummary } from '../api/types';

const filters = [
  { value: 'ALL', label: 'All' }, { value: 'OPEN', label: 'Open' }, { value: 'DONE', label: 'Resolved' },
];

export function ComplaintsScreen() {
  const nav = useNavigation<any>();
  const { api } = useSession();
  const [items, setItems] = useState<ComplaintSummary[] | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number, replace: boolean) => {
    setBusy(true);
    try {
      const res = await api.complaints(p);
      setItems((cur) => (replace || !cur ? res.results : [...cur, ...res.results]));
      setMore(!!res.next);
      setPage(p);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [api]);

  useFocusEffect(useCallback(() => { load(1, true); }, [load]));

  const shown = (items ?? []).filter((c) =>
    filter === 'ALL' ? true : filter === 'DONE' ? ['RESOLVED', 'CLOSED'].includes(c.status) : !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status));

  return (
    <Screen>
      <Title>My complaints</Title>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {filters.map((f) => <Chip key={f.value} label={f.label} active={filter === f.value} onPress={() => setFilter(f.value)} />)}
      </View>
      <ErrorText>{error}</ErrorText>
      {!items && !error && <Loading />}
      {items && shown.length === 0 && <Empty title="Nothing here" hint="Complaints you file will appear in this list." />}
      {shown.map((c) => (
        <Card key={c.public_id} onPress={() => nav.navigate('ComplaintDetails', { publicId: c.public_id })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>{c.tracking_code}</Text>
            <StatusBadge status={c.status} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{c.title}</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>{c.category_display} · {c.location_address}</Text>
          {c.feedback_rating ? <Text style={{ fontSize: 12, color: colors.haldi }}>{'★'.repeat(c.feedback_rating)}</Text> : null}
        </Card>
      ))}
      {more && <Button kind="secondary" title="Load more" busy={busy} onPress={() => load(page + 1, false)} />}
      <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>{formatDate(new Date().toISOString())}</Text>
    </Screen>
  );
}
