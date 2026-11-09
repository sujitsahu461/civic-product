import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Card, Empty, ErrorText, Loading, Screen, StatusBadge, Sub, Title } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { colors, formatDate } from '../theme';
import { listDrafts } from '../drafts';
import type { ComplaintSummary } from '../api/types';

export function HomeScreen() {
  const nav = useNavigation<any>();
  const { api, user } = useSession();
  const [items, setItems] = useState<ComplaintSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [drafts, setDrafts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        try {
          const page = await api.complaints(1);
          if (live) { setItems(page.results); setTotal(page.count); setError(null); }
        } catch (e) {
          if (live) setError((e as Error).message);
        }
        if (user) setDrafts((await listDrafts(user.public_id)).length);
      })();
      return () => { live = false; };
    }, [api, user]),
  );

  const open = items?.filter((c) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)).length ?? 0;
  const done = items?.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length ?? 0;
  const first = user?.full_name?.split(' ')[0] ?? '';

  return (
    <Screen>
      <Title>Namaste{first ? `, ${first}` : ''}</Title>
      <Sub>What would you like to do today?</Sub>
      <Button title="Report a civic problem" onPress={() => nav.navigate('Report')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Button kind="secondary" title="Track a complaint" onPress={() => nav.navigate('Track')} /></View>
        <View style={{ flex: 1 }}><Button kind="secondary" title={drafts ? `Drafts (${drafts})` : 'Drafts'} onPress={() => nav.navigate('Drafts')} /></View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[['Total', total], ['Open', open], ['Resolved', done]].map(([label, n]) => (
          <Card key={label as string} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.maroon }}>{n as number}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
          </Card>
        ))}
      </View>

      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 6 }}>Recent complaints</Text>
      <ErrorText>{error}</ErrorText>
      {!items && !error && <Loading />}
      {items?.length === 0 && <Empty title="No complaints yet" hint="When you report a problem it appears here." />}
      {items?.slice(0, 4).map((c) => (
        <Card key={c.public_id} onPress={() => nav.navigate('ComplaintDetails', { publicId: c.public_id })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>{c.tracking_code}</Text>
            <StatusBadge status={c.status} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{c.title}</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>{c.category_display} · {c.location_address}</Text>
        </Card>
      ))}
      {!!items?.length && <Text style={{ color: colors.muted, fontSize: 12 }}>Last updated {formatDate(new Date().toISOString())}</Text>}
    </Screen>
  );
}
