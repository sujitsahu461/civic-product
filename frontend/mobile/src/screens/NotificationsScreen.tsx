import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Empty, ErrorText, IconBubble, Loading, Screen, ScreenHeader } from '../components/ui';
import type { IconName } from '../components/brand';
import { useSession } from '../state/SessionContext';
import { brand, fonts } from '../brand';
import { colors, formatDateTime } from '../theme';
import type { Notification } from '../api/types';

function iconFor(n: Notification): IconName {
  const t = n.notification_type.toUpperCase();
  if (t.includes('RESOLV') || t.includes('CLOSE')) return 'checkmark-done-outline';
  if (t.includes('REJECT')) return 'close-circle';
  if (t.includes('ASSIGN')) return 'person-outline';
  if (t.includes('STATUS')) return 'refresh';
  if (t.includes('FEEDBACK')) return 'star-outline';
  return 'notifications-outline';
}

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

  const open = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await api.markRead(n.public_id);
        setItems((cur) => cur?.map((x) => (x.public_id === n.public_id ? { ...x, is_read: true } : x)) ?? null);
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        /* the list refreshes next time */
      }
    }
    if (n.complaint_tracking_code) nav.navigate('Main', { screen: 'Track', params: { code: n.complaint_tracking_code } });
  };

  const markAll = async () => {
    try {
      await api.markAllRead();
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'Updates on your complaints'}
        onBack={() => nav.goBack()}
        right={
          unread > 0 ? (
            <Pressable accessibilityRole="button" onPress={markAll} style={s.markAll}>
              <Ionicons name="checkmark-done-outline" size={16} color={colors.maroon} />
              <Text style={s.markAllText}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />
      <ErrorText>{error}</ErrorText>
      {!items && !error && <Loading />}
      {items?.length === 0 && (
        <Empty icon="checkmark-done-outline" title="You're all caught up" hint="Updates about your complaints and actions by officers appear here." />
      )}
      {items?.map((n) => (
        <Pressable
          key={n.public_id}
          accessibilityRole="button"
          accessibilityHint={n.complaint_tracking_code ? 'Opens the complaint' : undefined}
          onPress={() => open(n)}
          style={({ pressed }) => [s.item, !n.is_read && s.unread, pressed && { opacity: 0.88 }]}
        >
          <IconBubble icon={iconFor(n)} size={40} tint={n.is_read ? brand.sand : brand.kesariSoft} color={n.is_read ? colors.muted : colors.kesari} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={s.row}>
              <Text style={[s.title, !n.is_read && { fontFamily: fonts.heavy }]} numberOfLines={2}>{n.title}</Text>
              {!n.is_read && <View style={s.dot} />}
            </View>
            <Text style={s.msg}>{n.message}</Text>
            <View style={s.row}>
              <Text style={s.time}>{formatDateTime(n.created_at)}</Text>
              {!!n.complaint_tracking_code && <Text style={s.code}>{n.complaint_tracking_code} ›</Text>}
            </View>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: brand.blush, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { fontFamily: fonts.bold, fontSize: 12, color: colors.maroon },
  item: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  unread: { borderColor: '#F3C9A6', backgroundColor: '#FFFBF6' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.kesari },
  msg: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.muted },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  code: { fontFamily: fonts.bold, fontSize: 12, color: colors.maroon },
});
