import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brand, fonts, nativeDriver } from '../brand';
import { colors, statusStyle } from '../theme';
import type { Status } from '../api/types';
import type { IconName } from './brand';

// Browsers draw their own focus ring on inputs; the field border already shows focus.
const noWebOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

export function Screen({ children, scroll = true, pad = true }: { children: React.ReactNode; scroll?: boolean; pad?: boolean }) {
  const inner = scroll ? (
    <ScrollView overScrollMode="never" contentContainerStyle={[pad && s.pad, { gap: 14 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, gap: 14 }, pad && s.pad]}>{children}</View>
  );
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}>{inner}</SafeAreaView>;
}

/** Page header: optional back button, a display-face title, a subtitle and an optional slot on the right. */
export function ScreenHeader({ title, subtitle, onBack, right }: {
  title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode;
}) {
  return (
    <View style={s.header}>
      {onBack && (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.title} accessibilityRole="header">{title}</Text>
        {!!subtitle && <Text style={s.sub}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export const Title = ({ children }: { children: React.ReactNode }) => <Text style={s.title} accessibilityRole="header">{children}</Text>;
export const Sub = ({ children }: { children: React.ReactNode }) => <Text style={s.sub}>{children}</Text>;
export const Label = ({ children }: { children: React.ReactNode }) => <Text style={s.label}>{children}</Text>;

/** Section heading with an optional action on the right, e.g. "See all". */
export function SectionTitle({ children, action, onAction }: { children: React.ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.section} accessibilityRole="header">{children}</Text>
      {!!action && (
        <Text accessibilityRole="button" onPress={onAction} style={s.sectionAction}>{action}</Text>
      )}
    </View>
  );
}

/** Small uppercase label above a group, e.g. "COMMON CATEGORIES". */
export const Kicker = ({ children }: { children: React.ReactNode }) => <Text style={s.kicker}>{children}</Text>;

/** Round tinted icon. */
export function IconBubble({ icon, size = 40, tint = brand.kesariSoft, color = colors.kesari }: {
  icon: IconName; size?: number; tint?: string; color?: string;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

export function Card({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.88 }]}>
      {children}
    </Pressable>
  );
}

/** primary = kesari, secondary = maroon outline, danger = red tint, soft = sand. Presses in slightly. */
export function Button({ title, onPress, kind = 'primary', busy, disabled, icon, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'soft'; busy?: boolean; disabled?: boolean;
  icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const to = (v: number) => Animated.spring(press, { toValue: v, speed: 40, bounciness: 0, useNativeDriver: nativeDriver }).start();
  const off = busy || disabled;
  const fg = kind === 'primary' ? '#FFFFFF' : kind === 'danger' ? colors.danger : colors.maroon;
  // Arrows point the way, so they go after the text; other icons go before it.
  const trailing = !!icon && (icon.startsWith('arrow') || icon.startsWith('chevron'));
  const glyph = icon ? <Ionicons name={icon} size={18} color={fg} /> : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={off ? undefined : onPress}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      style={style}
    >
      <Animated.View
        style={[
          s.btn,
          kind === 'primary' && s.btnPrimary,
          kind === 'secondary' && s.btnSecondary,
          kind === 'danger' && s.btnDanger,
          kind === 'soft' && s.btnSoft,
          off && { opacity: 0.55 },
          { transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }] },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {!trailing && glyph}
            <Text style={[s.btnText, { color: fg }]}>{title}</Text>
            {trailing && glyph}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Text field with an optional leading icon, a focus ring, and a show/hide toggle for passwords. */
export function Field({ label, error, icon, secure, ...props }: TextInputProps & {
  label: string; error?: string; icon?: IconName; secure?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <View style={[s.inputWrap, props.multiline && { alignItems: 'flex-start' }, focus && s.inputFocus, !!error && { borderColor: colors.danger }]}>
        {!!icon && (
          <Ionicons name={icon} size={18} color={error ? colors.danger : focus ? colors.kesari : colors.muted} style={props.multiline ? { marginTop: 14 } : undefined} />
        )}
        <TextInput
          placeholderTextColor="#A5A9B2"
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          secureTextEntry={secure && hidden}
          onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
          style={[s.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, noWebOutline]}
        />
        {secure && (
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'} onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={s.err}>{error}</Text>}
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[s.chip, active && s.chipOn]}
    >
      {!!icon && <Ionicons name={icon} size={15} color={active ? '#FFFFFF' : colors.maroon} />}
      <Text style={[s.chipText, active && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const st = statusStyle[status] ?? statusStyle.PENDING;
  return (
    <View style={[s.badge, { backgroundColor: st.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: st.fg }]} />
      <Text style={[s.badgeText, { color: st.fg }]}>{st.label}</Text>
    </View>
  );
}

export const ErrorText = ({ children }: { children?: string | null }) =>
  children ? (
    <View style={s.errBanner} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={s.errBannerText}>{children}</Text>
    </View>
  ) : null;

/** A notice row, e.g. offline or unsent drafts. */
export function Notice({ icon, text, tone = 'haldi', onPress }: { icon: IconName; text: string; tone?: 'haldi' | 'maroon'; onPress?: () => void }) {
  const bg = tone === 'haldi' ? brand.haldiSoft : brand.blush;
  const body = (
    <View style={[s.notice, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={colors.maroon} />
      <Text style={s.noticeText}>{text}</Text>
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.maroon} />}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable> : body;
}

export function Empty({ title, hint, icon = 'document-text-outline', action, onAction }: {
  title: string; hint?: string; icon?: IconName; action?: string; onAction?: () => void;
}) {
  return (
    <View style={s.empty}>
      <IconBubble icon={icon} size={58} tint={brand.sand} color={colors.maroon} />
      <Text style={s.emptyTitle}>{title}</Text>
      {!!hint && <Text style={s.emptyHint}>{hint}</Text>}
      {!!action && onAction && <Button title={action} icon="add" onPress={onAction} style={{ marginTop: 6, alignSelf: 'stretch' }} />}
    </View>
  );
}

export const Loading = () => <ActivityIndicator style={{ margin: 24 }} color={colors.kesari} />;

/** Works on phones (Alert) and in the browser preview (window.confirm). */
export function confirmAction(title: string, message: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 44 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 35, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.2, color: colors.ink },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  sectionAction: { fontFamily: fonts.bold, fontSize: 14, color: colors.kesari },
  kicker: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 2, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
    boxShadow: '0px 4px 14px rgba(92, 21, 32, 0.05)',
  },
  btn: { minHeight: 50, borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnPrimary: { backgroundColor: colors.kesari, boxShadow: '0px 8px 18px rgba(217, 101, 11, 0.28)' },
  btnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.maroon },
  btnDanger: { backgroundColor: '#FCE8E6', borderWidth: 1, borderColor: '#F5C2BC' },
  btnSoft: { backgroundColor: brand.sand },
  btnText: { fontFamily: fonts.bold, fontSize: 15 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputFocus: { borderColor: colors.kesari, boxShadow: '0px 0px 0px 4px rgba(217, 101, 11, 0.12)' },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink, paddingVertical: 12 },
  err: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger },
  errBanner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FCE8E6', padding: 12, borderRadius: 12 },
  errBannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.danger },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  noticeText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.maroon },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
  },
  chipOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 18, gap: 6, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginTop: 6 },
  emptyHint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
});
