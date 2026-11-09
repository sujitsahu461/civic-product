import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TextStyle, Platform, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chip, Empty, ErrorText, Loading, Screen, ScreenHeader } from '../components/ui';
import { ComplaintCard } from '../components/ComplaintCard';
import type { IconName } from '../components/brand';
import { useSession } from '../state/SessionContext';
import { fonts } from '../brand';
import { categories, categoryMeta, colors } from '../theme';
import { ACTIVE, ComplaintStats, DONE, loadStats } from '../stats';
import type { ComplaintSummary } from '../api/types';

type Show = 'ALL' | 'ACTIVE' | 'DONE';
const noWebOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

export function ComplaintsScreen() {
  const nav = useNavigation<any>();
  const { api } = useSession();
  const [items, setItems] = useState<ComplaintSummary[] | null>(null);
  const [stats, setStats] = useState<ComplaintStats | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [show, setShow] = useState<Show>('ALL');
  const [category, setCategory] = useState('');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search as you type, after a short pause.
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const load = useCallback(
    async (p: number, replace: boolean) => {
      setBusy(true);
      try {
        const res = await api.complaints(p, { q: query, category: category || undefined });
        setItems((cur) => (replace || !cur ? res.results : [...cur, ...res.results]));
        setMore(!!res.next);
        setPage(p);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [api, query, category],
  );

  // Reloads when the screen comes into view, and again whenever the search or type changes.
  useFocusEffect(
    useCallback(() => {
      load(1, true);
    }, [load]),
  );
  useFocusEffect(
    useCallback(() => {
      loadStats(api).then(setStats).catch(() => {});
    }, [api]),
  );

  const shown = (items ?? []).filter((c) => (show === 'ALL' ? true : show === 'DONE' ? DONE.includes(c.status) : ACTIVE.includes(c.status)));
  const filtered = !!query || !!category || show !== 'ALL';

  const tiles: { key: Show; label: string; icon: IconName; value?: number }[] = [
    { key: 'ALL', label: 'Total', icon: 'document-text-outline', value: stats?.total },
    { key: 'ACTIVE', label: 'In progress', icon: 'time-outline', value: stats?.active },
    { key: 'DONE', label: 'Resolved', icon: 'checkmark-circle-outline', value: stats?.resolved },
  ];

  return (
    <Screen>
      <ScreenHeader title="My reports" subtitle="Every grievance registered on your account" />

      <View style={s.tiles} accessibilityRole="tablist">
        {tiles.map((t) => {
          const on = show === t.key;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setShow(t.key)}
              style={[s.tile, on && s.tileOn]}
            >
              <View style={s.tileHead}>
                <Ionicons name={t.icon} size={15} color={on ? colors.kesari : colors.muted} />
                <Text style={[s.tileLabel, on && { color: colors.kesari }]}>{t.label}</Text>
              </View>
              <Text style={s.tileNum}>{t.value ?? '–'}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.search}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search by title, place or CMP code"
          placeholderTextColor="#A5A9B2"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search your reports"
          style={[s.searchInput, noWebOutline]}
        />
        {!!text && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView overScrollMode="never" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipRow}>
        <Chip label="All types" active={!category} onPress={() => setCategory('')} />
        {categories.map((c) => (
          <Chip
            key={c.value}
            label={c.label}
            icon={categoryMeta[c.value]?.icon as IconName}
            active={category === c.value}
            onPress={() => setCategory(category === c.value ? '' : c.value)}
          />
        ))}
      </ScrollView>

      <ErrorText>{error}</ErrorText>
      {!items && !error && <Loading />}
      {items && shown.length === 0 && (
        filtered ? (
          <Empty icon="folder-open-outline" title="No reports match" hint="Try another search, type or status." />
        ) : (
          <Empty
            icon="folder-open-outline"
            title="No issues reported yet"
            hint="Seen a civic problem in your neighbourhood? Send a quick report."
            action="Report an issue"
            onAction={() => nav.navigate('Report')}
          />
        )
      )}
      {shown.map((c) => (
        <ComplaintCard key={c.public_id} c={c} onPress={() => nav.navigate('ComplaintDetails', { publicId: c.public_id })} />
      ))}
      {more && <Button kind="secondary" title="Load more" busy={busy} onPress={() => load(page + 1, false)} />}
    </Screen>
  );
}

const s = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  tileOn: { borderColor: colors.kesari, boxShadow: '0px 0px 0px 3px rgba(217, 101, 11, 0.12)' },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  tileNum: { fontFamily: fonts.heavy, fontSize: 22, lineHeight: 28, color: colors.ink },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink, paddingVertical: 10 },
  chipRow: { marginHorizontal: -18, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 18 },
});
