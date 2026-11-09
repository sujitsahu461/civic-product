import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, IconBubble, StatusBadge } from './ui';
import { brand, fonts } from '../brand';
import { categoryMeta, colors, formatDate } from '../theme';
import type { ComplaintSummary } from '../api/types';
import type { IconName } from './brand';

/** One complaint in a list: category icon, title, code, status, place and date. */
export function ComplaintCard({ c, onPress }: { c: ComplaintSummary; onPress: () => void }) {
  const icon = (categoryMeta[c.category]?.icon ?? 'document-text-outline') as IconName;
  return (
    <Card onPress={onPress} style={s.card}>
      <View style={s.row}>
        <IconBubble icon={icon} size={42} tint={brand.kesariSoft} color={colors.kesari} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={s.topRow}>
            <Text style={s.code}>{c.tracking_code}</Text>
            <StatusBadge status={c.status} />
          </View>
          <Text style={s.title} numberOfLines={2}>{c.title}</Text>
          <View style={s.meta}>
            <Text style={s.metaText} numberOfLines={1}>{c.category_display}</Text>
            {!!c.location_address && (
              <>
                <Text style={s.sep}>·</Text>
                <Ionicons name="location-outline" size={12} color={colors.muted} />
                <Text style={[s.metaText, { flexShrink: 1 }]} numberOfLines={1}>{c.location_address}</Text>
              </>
            )}
          </View>
          <View style={s.foot}>
            {!!c.created_at && <Text style={s.date}>{formatDate(c.created_at)}</Text>}
            {c.feedback_rating ? <Text style={s.stars}>{'★'.repeat(c.feedback_rating)}</Text> : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { padding: 14 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  code: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, letterSpacing: 0.3 },
  title: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  sep: { color: colors.muted },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  stars: { color: colors.haldi, fontSize: 13 },
});
