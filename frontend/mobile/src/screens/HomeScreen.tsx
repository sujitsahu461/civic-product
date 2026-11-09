import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Empty, ErrorText, IconBubble, Kicker, Loading, Notice, Screen, SectionTitle } from '../components/ui';
import { ComplaintCard } from '../components/ComplaintCard';
import { IconName, Seal, Wordmark } from '../components/brand';
import { useSession } from '../state/SessionContext';
import { useConnectivity } from '../state/ConnectivityContext';
import { brand, fonts } from '../brand';
import { categoryLabel, categoryMeta, colors } from '../theme';
import { listDrafts } from '../drafts';
import { ComplaintStats, loadStats } from '../stats';
import type { ComplaintSummary } from '../api/types';

const QUICK_CATEGORIES = ['ROAD', 'WATER', 'GARBAGE', 'STREET_LIGHT'];

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const initials = (name?: string) =>
  (name ?? '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

export function HomeScreen() {
  const nav = useNavigation<any>();
  const { api, user } = useSession();
  const { online } = useConnectivity();
  const [items, setItems] = useState<ComplaintSummary[] | null>(null);
  const [stats, setStats] = useState<ComplaintStats | null>(null);
  const [unread, setUnread] = useState(0);
  const [drafts, setDrafts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        try {
          const [page, st] = await Promise.all([api.complaints(1), loadStats(api)]);
          if (live) {
            setItems(page.results);
            setStats(st);
            setError(null);
          }
        } catch (e) {
          if (live) setError((e as Error).message);
        }
        try {
          const n = await api.notifications();
          if (live) setUnread(n.unread_count);
        } catch {
          /* the bell just shows no count */
        }
        if (user) {
          const d = await listDrafts(user.public_id);
          if (live) setDrafts(d.length);
        }
      })();
      return () => {
        live = false;
      };
    }, [api, user]),
  );

  const first = user?.full_name?.split(' ')[0] ?? 'Citizen';

  return (
    <Screen>
      <View style={s.topBar}>
        <View style={s.brandRow}>
          <Seal size={36} />
          <Wordmark size={21} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          onPress={() => nav.navigate('Notifications')}
          style={s.roundBtn}
        >
          <Ionicons name="notifications-outline" size={21} color={colors.ink} />
          {unread > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => nav.navigate('Profile')} style={s.avatar}>
          <Text style={s.avatarText}>{initials(user?.full_name)}</Text>
        </Pressable>
      </View>

      <View style={[s.pill, !online && { backgroundColor: '#FCE8E6', borderColor: '#F5C2BC' }]}>
        <View style={[s.pillDot, { backgroundColor: online ? colors.ok : colors.danger }]} />
        <Text style={[s.pillText, !online && { color: colors.danger }]}>
          {online ? 'Municipal grievance portal' : 'Offline · new reports are saved as drafts'}
        </Text>
      </View>

      <View>
        <Text style={s.hello}>{greeting()}, {first}</Text>
        <Text style={s.headline}>
          Let's make our city <Text style={{ color: colors.kesari }}>better</Text>
        </Text>
      </View>

      <View style={s.tiles}>
        <Pressable accessibilityRole="button" onPress={() => nav.navigate('Report')} style={({ pressed }) => [s.tile, s.tileReport, pressed && s.pressed]}>
          <View style={s.tileIcon}>
            <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={s.tileTitle}>Report an issue</Text>
          <Text style={s.tileSub}>To your municipality</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => nav.navigate('Track')} style={({ pressed }) => [s.tile, s.tileTrack, pressed && s.pressed]}>
          <View style={s.tileIcon}>
            <Ionicons name="search-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={s.tileTitle}>Track complaint</Text>
          <Text style={s.tileSub}>Check status with a code</Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={() => nav.navigate('Complaints')} style={s.stats}>
        <Stat icon="document-text-outline" label="My reports" value={stats?.total} tint={brand.kesariSoft} color={colors.kesari} />
        <View style={s.statLine} />
        <Stat icon="time-outline" label="In progress" value={stats?.active} tint="#E1ECF9" color="#1D4E89" />
        <View style={s.statLine} />
        <Stat icon="checkmark-circle-outline" label="Resolved" value={stats?.resolved} tint="#E3F4E8" color={colors.ok} />
      </Pressable>

      {drafts > 0 && (
        <Notice
          icon="cloud-offline-outline"
          text={`${drafts} unsent ${drafts === 1 ? 'draft' : 'drafts'} waiting. Tap to review.`}
          onPress={() => nav.navigate('Drafts')}
        />
      )}

      <SectionTitle action={items?.length ? 'See all' : undefined} onAction={() => nav.navigate('Complaints')}>
        My reported grievances
      </SectionTitle>
      <ErrorText>{error}</ErrorText>
      {!items && !error && <Loading />}
      {items?.length === 0 && (
        <Empty
          title="No grievances reported yet"
          hint="Seen a pothole, a garbage dump or a broken street light? Report it in a minute with its location."
          action="Report an issue"
          onAction={() => nav.navigate('Report')}
        />
      )}
      {items?.slice(0, 3).map((c) => (
        <ComplaintCard key={c.public_id} c={c} onPress={() => nav.navigate('ComplaintDetails', { publicId: c.public_id })} />
      ))}

      <Kicker>COMMON MUNICIPAL CATEGORIES</Kicker>
      <View style={s.grid}>
        {QUICK_CATEGORIES.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityHint="Opens a new report with this category chosen"
            onPress={() => nav.navigate('Report', { category: value })}
            style={({ pressed }) => [s.cat, pressed && s.pressed]}
          >
            <IconBubble icon={categoryMeta[value].icon as IconName} size={40} tint={brand.haldiSoft} color={colors.maroon} />
            <View style={{ flex: 1 }}>
              <Text style={s.catTitle} numberOfLines={1}>{categoryLabel(value)}</Text>
              <Text style={s.catHint} numberOfLines={2}>{categoryMeta[value].hint}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={() => nav.navigate('Report')} style={({ pressed }) => [s.banner, pressed && s.pressed]}>
        <IconBubble icon="leaf-outline" size={44} tint="#FFFFFF" color={colors.ok} />
        <View style={{ flex: 1 }}>
          <Text style={s.bannerTitle}>A cleaner city starts with all of us.</Text>
          <Text style={s.bannerText}>Report a problem near you and follow it until it is fixed.</Text>
        </View>
        <View style={s.bannerArrow}>
          <Ionicons name="arrow-forward" size={18} color={colors.kesari} />
        </View>
      </Pressable>
    </Screen>
  );
}

function Stat({ icon, label, value, tint, color }: { icon: IconName; label: string; value?: number; tint: string; color: string }) {
  return (
    <View style={s.stat}>
      <IconBubble icon={icon} size={34} tint={tint} color={color} />
      <View>
        <Text style={s.statNum}>{value ?? '–'}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.kesari,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 12, color: '#FFFFFF' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 15, color: '#FFFFFF' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  hello: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  headline: { fontFamily: fonts.display, fontSize: 30, lineHeight: 37, color: colors.ink },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, borderRadius: 22, padding: 16, minHeight: 160, justifyContent: 'flex-end', gap: 2 },
  tileReport: { backgroundColor: colors.kesari, boxShadow: '0px 10px 22px rgba(217, 101, 11, 0.3)' },
  tileTrack: { backgroundColor: colors.maroon, boxShadow: '0px 10px 22px rgba(122, 31, 43, 0.3)' },
  tileIcon: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: '#FFFFFF' },
  tileSub: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  statLine: { width: 1, alignSelf: 'stretch', backgroundColor: colors.line },
  statNum: { fontFamily: fonts.heavy, fontSize: 18, lineHeight: 22, color: colors.ink },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cat: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  catTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  catHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 15, color: colors.muted },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E8F3EA',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#C9E4CF',
    padding: 16,
  },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  bannerText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  bannerArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
