import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, ErrorText, Field, Screen, Sub, Title } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { colors } from '../theme';
import type { Captcha } from '../api/types';
import type { ApiError } from '../api/client';

export function AuthScreen() {
  const { api, signIn, signUp } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [info, setInfo] = useState<string | null>(null);

  const loadCaptcha = useCallback(async () => {
    setAnswer('');
    try {
      setCaptcha(await api.captcha());
    } catch (e) {
      setCaptcha(null);
      setError((e as Error).message);
    }
  }, [api]);

  useEffect(() => {
    if (mode === 'login') loadCaptcha();
  }, [mode, loadCaptcha]);

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

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 12, gap: 4 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: colors.maroon }}>CivicSetu</Text>
        <Sub>Report civic problems. Track them. See them fixed.</Sub>
      </View>
      <Card>
        <Title>{mode === 'login' ? 'Sign in' : 'Create your account'}</Title>
        {!!error && <ErrorText>{error}</ErrorText>}
        {!!info && <Text style={{ color: colors.ok }}>{info}</Text>}
        {mode === 'register' && (
          <Field label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" error={fields.full_name} />
        )}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={fields.email} />
        {mode === 'register' && (
          <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={fields.phone} />
        )}
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry error={fields.password} />
        {mode === 'login' && (
          <View style={{ gap: 6 }}>
            <Field
              label={captcha ? `Security question: ${captcha.question}` : 'Security question'}
              value={answer}
              onChangeText={setAnswer}
              keyboardType="number-pad"
              error={fields.captcha_code}
            />
            <Text onPress={loadCaptcha} style={{ color: colors.kesari, fontWeight: '700', fontSize: 13 }}>New question</Text>
          </View>
        )}
        <Button title={mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} busy={busy} />
        {mode === 'login' && (
          <Text onPress={forgot} style={{ color: colors.maroon, textAlign: 'center', fontWeight: '600', marginTop: 4 }}>
            Forgot password?
          </Text>
        )}
      </Card>
      <Text
        onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setFields({}); }}
        style={{ textAlign: 'center', color: colors.maroon, fontWeight: '700' }}
      >
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </Text>
    </Screen>
  );
}
