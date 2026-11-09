import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandButton, Reveal, Seal, Wordmark } from '../components/brand';
import { brand, fonts, useReducedMotion } from '../brand';
import { colors } from '../theme';
import type { GuestStackParamList } from '../navigation';

type Props = NativeStackScreenProps<GuestStackParamList, 'Landing'>;

export function LandingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();

  return (
    <View style={s.root}>
      <ScrollView overScrollMode="never" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
          <Reveal reduce={reduce} style={s.brandRow}>
            <Seal size={34} />
            <Wordmark size={22} onDark />
          </Reveal>

          <Reveal reduce={reduce} delay={90}>
            <Text style={s.headline} accessibilityRole="header">
              Your street's problems, <Text style={{ color: colors.haldi }}>bridged</Text> to the people who fix them.
            </Text>
          </Reveal>

          <Reveal reduce={reduce} delay={180}>
            <Text style={s.lede}>
              Report a pothole, a leak or a dark street light in a minute, then follow it until it is resolved.
            </Text>
          </Reveal>
        </View>

        <Reveal reduce={reduce} delay={260} style={s.trackWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Opens complaint tracking. No account needed."
            onPress={() => navigation.navigate('Track')}
            style={({ pressed }) => [s.trackCard, pressed && { opacity: 0.85 }]}
          >
            <View style={[s.iconChip, { backgroundColor: brand.haldiSoft }]}>
              <Ionicons name="locate-outline" size={22} color={colors.maroon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.trackTitle}>Have a tracking code?</Text>
              <Text style={s.trackBody}>Check any complaint's progress. No account needed.</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.kesari} />
          </Pressable>
        </Reveal>

      </ScrollView>

      <View style={[s.dock, { paddingBottom: insets.bottom + 14 }]}>
        <BrandButton title="Create a free account" icon="arrow-forward" onPress={() => navigation.navigate('Auth', { mode: 'register' })} />
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Auth', { mode: 'login' })} hitSlop={8}>
          <Text style={s.signIn}>
            Already have an account? <Text style={{ color: colors.kesari }}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.maroon,
    paddingHorizontal: 24,
    paddingBottom: 44,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headline: { marginTop: 26, fontFamily: fonts.display, fontSize: 28, lineHeight: 35, color: '#FFFFFF' },
  lede: { marginTop: 8, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: brand.blush },
  trackWrap: { marginTop: -30, marginHorizontal: 20 },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    boxShadow: '0px 12px 30px rgba(92, 21, 32, 0.16)',
  },
  iconChip: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  trackTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  trackBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.muted },
  dock: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
    backgroundColor: colors.bg,
  },
  signIn: { textAlign: 'center', fontFamily: fonts.semibold, fontSize: 15, color: colors.maroon },
});
