import React from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, statusStyle } from '../theme';
import type { Status } from '../api/types';

export function Screen({ children, scroll = true, pad = true }: { children: React.ReactNode; scroll?: boolean; pad?: boolean }) {
  const inner = scroll ? (
    <ScrollView contentContainerStyle={[pad && s.pad, { gap: 12 }]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, gap: 12 }, pad && s.pad]}>{children}</View>
  );
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}>{inner}</SafeAreaView>;
}

export const Title = ({ children }: { children: React.ReactNode }) => <Text style={s.title}>{children}</Text>;
export const Sub = ({ children }: { children: React.ReactNode }) => <Text style={s.sub}>{children}</Text>;
export const Label = ({ children }: { children: React.ReactNode }) => <Text style={s.label}>{children}</Text>;

export function Card({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const body = <View style={[s.card, style]}>{children}</View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable> : body;
}

export function Button({ title, onPress, kind = 'primary', busy, disabled }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; busy?: boolean; disabled?: boolean;
}) {
  const off = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={off ? undefined : onPress}
      style={[s.btn, kind === 'secondary' && s.btnSecondary, kind === 'danger' && s.btnDanger, off && { opacity: 0.55 }]}
    >
      {busy ? <ActivityIndicator color={kind === 'secondary' ? colors.maroon : '#fff'} /> : (
        <Text style={[s.btnText, kind === 'secondary' && { color: colors.maroon }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor="#98A2B3"
        {...props}
        style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, !!error && { borderColor: colors.danger }]}
      />
      {!!error && <Text style={s.err}>{error}</Text>}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[s.chip, active && s.chipOn]}>
      <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const st = statusStyle[status] ?? statusStyle.PENDING;
  return (
    <View style={[s.badge, { backgroundColor: st.bg }]}>
      <Text style={[s.badgeText, { color: st.fg }]}>{st.label}</Text>
    </View>
  );
}

export const ErrorText = ({ children }: { children?: string | null }) =>
  children ? <Text style={s.errBanner}>{children}</Text> : null;

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 6 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{title}</Text>
      {!!hint && <Text style={{ color: colors.muted, textAlign: 'center' }}>{hint}</Text>}
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
  pad: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', color: colors.ink, letterSpacing: 0.3 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 6 },
  btn: { backgroundColor: colors.kesari, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.maroon },
  btnDanger: { backgroundColor: colors.danger },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink },
  err: { color: colors.danger, fontSize: 12 },
  errBanner: { color: colors.danger, backgroundColor: '#FCE8E6', padding: 10, borderRadius: 10, fontSize: 13 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  chipText: { fontSize: 13, color: colors.ink, fontWeight: '600' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
