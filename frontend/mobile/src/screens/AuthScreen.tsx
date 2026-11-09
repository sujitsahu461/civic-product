import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandButton, Halo, IconName, Reveal, Seal } from '../components/brand';
import { brand, fonts, nativeDriver, useReducedMotion } from '../brand';
import { useSession } from '../state/SessionContext';
import { colors } from '../theme';
import type { Captcha } from '../api/types';
import type { ApiError } from '../api/client';
import type { GuestStackParamList } from '../navigation';

type Props = NativeStackScreenProps<GuestStackParamList, 'Auth'>;

// Browsers draw their own focus ring on inputs; the field border already shows focus.
const noWebOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;
type Mode = 'login' | 'register';

const COPY: Record<Mode, { title: string; sub: string; action: string }> = {
  login: {
    title: 'Welcome back',
    sub: 'Sign in to report problems and follow your complaints.',
    action: 'Sign in',
  },
  register: {
    title: 'Join the bridge',
    sub: 'Create a citizen account in under a minute.',
    action: 'Create account',
  },
};

export function AuthScreen({ navigation, route }: Props) {
  const { api, signIn, signUp } = useSession();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>(route.params?.mode ?? 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [info, setInfo] = useState<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

  const loadCaptcha = useCallback(async () => {
    setAnswer('');
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
    try {
      setCaptcha(await api.captcha());
      setCaptchaFailed(false);
    } catch {
      setCaptcha(null);
      setCaptchaFailed(true);
    }
  }, [api, spin]);

  useEffect(() => {
    if (mode === 'login') loadCaptcha();
  }, [mode, loadCaptcha]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setInfo(null);
    setFields({});
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    setFields({});
    if (!email.trim() || !password) return setError('Enter your email and password.');
    if (mode === 'register' && !fullName.trim()) return setError('Enter your full name.');
    if (mode === 'login' && (!captcha || !answer.trim())) return setError('Answer the security question.');
    setBusy(true);
    try {
      if (mode === 'login') await signIn(email, password, captcha!.captcha_key, answer.trim());
      else await signUp({ email, password, full_name: fullName.trim(), phone: phone.trim() });
    } catch (e) {
      setError((e as Error).message);
      setFields((e as ApiError).fields ?? {});
      if (mode === 'login') loadCaptcha();
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    if (!email.trim()) return setError('Enter your email first, then tap Forgot password.');
    try {
      const res = await api.forgotPassword(email.trim());
      setInfo(res.detail);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const copy = COPY[mode];
  const hints = [
    { ok: password.length >= 8, label: 'At least 8 characters' },
    { ok: password.length > 0 && /\D/.test(password), label: 'Not only numbers' },
  ];

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView overScrollMode="never" contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <Halo size={300} top={-120} left={180} opacity={0.08} />
          <Halo size={180} top={120} left={-90} opacity={0.06} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Landing'))}
            style={s.back}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={s.headerRow}>
            <Seal size={64} />
            <Reveal key={mode} reduce={reduce} style={{ flex: 1 }}>
              <Text style={s.title} accessibilityRole="header">{copy.title}</Text>
              <Text style={s.sub}>{copy.sub}</Text>
            </Reveal>
          </View>
        </View>

        <Reveal reduce={reduce} delay={60} style={s.sheet}>
          <Segmented mode={mode} onChange={switchMode} reduce={reduce} />

          <Reveal key={mode} reduce={reduce} style={{ gap: 14 }}>
            {!!error && (
              <View style={s.banner} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={[s.bannerText, { color: colors.danger }]}>{error}</Text>
              </View>
            )}
            {!!info && (
              <View style={[s.banner, { backgroundColor: '#E3F4E8' }]} accessibilityLiveRegion="polite">
                <Ionicons name="mail-open-outline" size={18} color={colors.ok} />
                <Text style={[s.bannerText, { color: colors.ok }]}>{info}</Text>
              </View>
            )}

            {mode === 'register' && (
              <AuthField
                icon="person-outline"
                label="Full name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
                placeholder="As on your ID"
                error={fields.full_name}
              />
            )}
            <AuthField
              icon="mail-outline"
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              error={fields.email}
            />
            {mode === 'register' && (
              <AuthField
                icon="call-outline"
                label="Phone (optional)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="For updates about your complaints"
                error={fields.phone}
              />
            )}
            <AuthField
              icon="lock-closed-outline"
              label="Password"
              value={password}
              onChangeText={setPassword}
              secure
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'login' ? 'Your password' : 'Choose a password'}
              error={fields.password}
            />

            {mode === 'register' && (
              <View style={s.hints}>
                {hints.map((h) => (
                  <View key={h.label} style={s.hint}>
                    <Ionicons name={h.ok ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={h.ok ? colors.ok : colors.muted} />
                    <Text style={[s.hintText, h.ok && { color: colors.ok }]}>{h.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {mode === 'login' && (
              <View style={[s.captcha, !!fields.captcha_code && { borderColor: colors.danger }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.captchaKicker}>QUICK CHECK</Text>
                  <Text style={s.captchaQ}>
                    {captcha ? captcha.question : captchaFailed ? 'Could not load. Tap refresh.' : 'Loading…'}
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel={captcha ? `Answer: ${captcha.question}` : 'Security answer'}
                  value={answer}
                  onChangeText={setAnswer}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="?"
                  placeholderTextColor={brand.blushMuted}
                  style={[s.captchaInput, noWebOutline]}
                />
                <Pressable accessibilityRole="button" accessibilityLabel="New question" onPress={loadCaptcha} hitSlop={8} style={s.refresh}>
                  <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                    <Ionicons name="refresh" size={20} color={colors.maroon} />
                  </Animated.View>
                </Pressable>
              </View>
            )}
            {!!fields.captcha_code && <Text style={s.err}>{fields.captcha_code}</Text>}

            <BrandButton title={copy.action} icon="arrow-forward" onPress={submit} busy={busy} style={{ marginTop: 4 }} />

            {mode === 'login' ? (
              <Text accessibilityRole="button" onPress={forgot} style={s.link}>Forgot password?</Text>
            ) : (
              <Text style={s.fine}>
                Public sign-up creates citizen accounts. Officer and admin accounts are created by your municipality.
              </Text>
            )}
          </Reveal>

          <View style={{ flex: 1 }} />
          <Text
            accessibilityRole="button"
            onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}
            style={[s.switch, { marginBottom: insets.bottom + 8 }]}
          >
            {mode === 'login' ? 'New to CivicSetu? ' : 'Already have an account? '}
            <Text style={{ color: colors.kesari }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</Text>
          </Text>
        </Reveal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Two-way switch with a sliding pill. */
function Segmented({ mode, onChange, reduce }: { mode: Mode; onChange: (m: Mode) => void; reduce: boolean | null }) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(mode === 'login' ? 0 : 1)).current;
  useEffect(() => {
    const to = mode === 'login' ? 0 : 1;
    if (reduce) x.setValue(to);
    else Animated.spring(x, { toValue: to, friction: 9, tension: 90, useNativeDriver: nativeDriver }).start();
  }, [mode, reduce, x]);
  const half = Math.max(0, (w - 8) / 2);
  const tabs: { key: Mode; label: string }[] = [
    { key: 'login', label: 'Sign in' },
    { key: 'register', label: 'Create account' },
  ];
  return (
    <View style={s.seg} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {w > 0 && (
        <Animated.View
          style={[s.segPill, { width: half, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, half] }) }] }]}
        />
      )}
      {tabs.map((t) => (
        <Pressable
          key={t.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === t.key }}
          onPress={() => onChange(t.key)}
          style={s.segBtn}
        >
          <Text style={[s.segText, mode === t.key && s.segTextOn]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Text field with a leading icon, a focus ring and (for passwords) a show/hide toggle. */
function AuthField({ icon, label, error, secure, ...props }: TextInputProps & {
  icon: IconName; label: string; error?: string; secure?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputWrap, focus && s.inputFocus, !!error && { borderColor: colors.danger }]}>
        <Ionicons name={icon} size={18} color={error ? colors.danger : focus ? colors.kesari : colors.muted} />
        <TextInput
          {...props}
          accessibilityLabel={label}
          secureTextEntry={secure && hidden}
          placeholderTextColor="#A5A9B2"
          onFocus={(e) => {
            setFocus(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            props.onBlur?.(e);
          }}
          style={[s.input, noWebOutline]}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={s.err}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.maroon },
  header: { paddingHorizontal: 22, paddingBottom: 30, overflow: 'hidden' },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 18 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40, color: '#FFFFFF' },
  sub: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: brand.blush },
  sheet: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 18,
  },
  seg: { flexDirection: 'row', backgroundColor: brand.sand, borderRadius: 16, padding: 4 },
  segPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 3px 10px rgba(92, 21, 32, 0.12)',
  },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  segTextOn: { fontFamily: fonts.bold, color: colors.maroon },
  banner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FCE8E6', borderRadius: 12, padding: 12 },
  bannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  label: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.3, color: colors.ink },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputFocus: { borderColor: colors.kesari, boxShadow: '0px 0px 0px 4px rgba(217, 101, 11, 0.12)' },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  err: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  hints: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: -4 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  captcha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.haldiSoft,
    borderWidth: 1.5,
    borderColor: '#F6DC85',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  captchaKicker: { fontFamily: fonts.heavy, fontSize: 10, letterSpacing: 2, color: '#8A5A00' },
  captchaQ: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.maroon },
  captchaInput: {
    width: 64,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.ink,
    borderWidth: 1.5,
    borderColor: '#F6DC85',
  },
  refresh: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  link: { textAlign: 'center', fontFamily: fonts.bold, fontSize: 15, color: colors.maroon },
  fine: { textAlign: 'center', fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  switch: { textAlign: 'center', fontFamily: fonts.semibold, fontSize: 15, color: colors.maroon, paddingVertical: 6 },
});
