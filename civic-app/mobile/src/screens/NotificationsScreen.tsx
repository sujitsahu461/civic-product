import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Card, Empty, ErrorText, Loading, Screen, Title } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { colors, formatDateTime } from '../theme';
import type { Notification } from '../api/types';

export function NotificationsScreen() {
  const nav = useNavigation<any>();
  const { api } = useSession();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.notifications();
      setItems(res.notifications);
      setUnread(res.unread_count);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const read = async (n: Notification) => {
    if (n.is_read) return;
    try {
      await api.markRead(n.public_id);
      setItems((cur) => cur?.map((x) => (x.public_id === n.public_id ? { ...x, is_read: true } : x)) ?? null);
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* the list refreshes next time */
    }
  };

  return (
    <Screen>
      <Title>Notifications{unread ? ` (${unread})` : ''}</Title>
      {unread > 0 && (
        <Button kind="secondary" title="Mark all as read" onPress={async () => { await api.markAllRead(); load(); }} />
      )}
      <ErrorText>{error}</ErrorText>
      {!items && !error && <Loading />}
      {items?.length === 0 && <Empty title="No notifications yet" hint="Updates about your complaints show up here." />}
      {items?.map((n) => (
        <Pressable key={n.public_id} accessibilityRole="button" onPress={() => read(n)}>
          <Card style={n.is_read ? undefined : { borderColor: colors.kesari, borderWidth: 1.5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: n.is_read ? '600' : '800', color: colors.ink, flex: 1 }}>{n.title}</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>{formatDateTime(n.created_at)}</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{n.message}</Text>
            {n.complaint_tracking_code && (
              <Text style={{ color: colors.maroon, fontSize: 12, fontWeight: '700' }} onPress={() => nav.navigate('Track')}>
                {n.complaint_tracking_code}
              </Text>
            )}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
