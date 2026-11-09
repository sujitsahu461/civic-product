import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorText, Field, IconBubble, Screen, ScreenHeader, confirmAction, notify } from '../components/ui';
import type { IconName } from '../components/brand';
import { useSession } from '../state/SessionContext';
import { API_URL } from '../config';
import { brand, fonts } from '../brand';
import { colors } from '../theme';
import type { ApiError } from '../api/client';

type Panel = 'none' | 'edit' | 'password';

const initials = (name?: string) =>
  (name ?? '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

export function ProfileScreen() {
  const nav = useNavigation<any>();
  const { api, user, setUser, signOut } = useSession();
  const [panel, setPanel] = useState<Panel>('none');

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) { setFullName(user.full_name); setPhone(user.phone ?? ''); setAddress(user.address); setBio(user.bio); }
  }, [user]);

  const toggle = (p: Panel) => {
    setPanel((cur) => (cur === p ? 'none' : p));
    setError(null);
    setFields({});
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setFields({});
    try {
      setUser(await api.updateProfile({ full_name: fullName.trim(), phone: phone.trim(), address: address.trim(), bio: bio.trim() }));
      setPanel('none');
      notify('Saved', 'Your profile was updated.');
    } catch (e) {
      setError((e as Error).message);
      setFields((e as ApiError).fields ?? {});
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setError(null);
    setFields({});
    if (!oldPw || !newPw) return setError('Enter your current password and a new one.');
    if (newPw !== confirmPw) return setFields({ confirm_password: 'The two new passwords do not match.' });
    setBusy(true);
    try {
      await api.changePassword(oldPw, newPw, confirmPw);
      setOldPw(''); setNewPw(''); setConfirmPw('');
      setPanel('none');
      notify('Password changed', 'Use your new password next time you sign in.');
    } catch (e) {
      setError((e as Error).message);
      setFields((e as ApiError).fields ?? {});
    } finally {
      setBusy(false);
    }
  };

  const logOut = async () => {
    if (await confirmAction('Sign out?', 'You will need your email and password to sign in again.', 'Sign out')) signOut();
  };

  const links: { icon: IconName; title: string; sub: string; go: () => void }[] = [
    { icon: 'camera-outline', title: 'Report', sub: 'A new problem', go: () => nav.navigate('Report') },
    { icon: 'search-outline', title: 'Track', sub: 'Any complaint', go: () => nav.navigate('Track') },
    { icon: 'notifications-outline', title: 'Updates', sub: 'Notifications', go: () => nav.navigate('Notifications') },
  ];

  return (
    <Screen>
      <ScreenHeader title="Profile" subtitle="Your account and details" />

      <Card style={s.card}>
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials(user?.full_name)}</Text>
          </View>
        </View>
        <Text style={s.name}>{user?.full_name}</Text>
        <View style={s.rolePill}>
          <Ionicons name="shield-checkmark" size={13} color={colors.ok} />
          <Text style={s.roleText}>Citizen account</Text>
        </View>
        <View style={s.contact}>
          <View style={s.contactRow}>
            <Ionicons name="mail-outline" size={15} color={colors.muted} />
            <Text style={s.contactText}>{user?.email}</Text>
          </View>
          {!!user?.phone && (
            <View style={s.contactRow}>
              <Ionicons name="call-outline" size={15} color={colors.muted} />
              <Text style={s.contactText}>{user.phone}</Text>
            </View>
          )}
        </View>
        <View style={s.actions}>
          <Button kind="soft" icon="create-outline" title="Edit profile" onPress={() => toggle('edit')} style={{ flex: 1 }} />
          <Button kind="soft" icon="key-outline" title="Password" onPress={() => toggle('password')} style={{ flex: 1 }} />
        </View>
      </Card>

      {panel === 'edit' && (
        <Card>
          <Text style={s.panelTitle}>Edit your details</Text>
          <ErrorText>{error}</ErrorText>
          <Field icon="person-outline" label="Full name" value={fullName} onChangeText={setFullName} error={fields.full_name} />
          <Field icon="call-outline" label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={fields.phone} />
          <Field icon="location-outline" label="Address" value={address} onChangeText={setAddress} error={fields.address} />
          <Field label="About you" value={bio} onChangeText={setBio} multiline error={fields.bio} />
          <Button title="Save changes" icon="checkmark" onPress={save} busy={busy} />
        </Card>
      )}

      {panel === 'password' && (
        <Card>
          <Text style={s.panelTitle}>Change password</Text>
          <ErrorText>{error}</ErrorText>
          <Field icon="lock-closed-outline" label="Current password" value={oldPw} onChangeText={setOldPw} secure autoComplete="current-password" error={fields.old_password} />
          <Field icon="key-outline" label="New password" value={newPw} onChangeText={setNewPw} secure autoComplete="new-password" error={fields.new_password} />
          <Field icon="key-outline" label="Confirm new password" value={confirmPw} onChangeText={setConfirmPw} secure autoComplete="new-password" error={fields.confirm_password} />
          <Text style={s.hint}>At least 8 characters, not only numbers, and different from your current one.</Text>
          <Button title="Update password" icon="checkmark" onPress={changePassword} busy={busy} />
        </Card>
      )}

      <Button kind="danger" icon="log-out-outline" title="Sign out" onPress={logOut} />

      <View style={s.links}>
        {links.map((l) => (
          <Pressable key={l.title} accessibilityRole="button" onPress={l.go} style={({ pressed }) => [s.link, pressed && { opacity: 0.85 }]}>
            <IconBubble icon={l.icon} size={44} tint={brand.kesariSoft} color={colors.kesari} />
            <Text style={s.linkTitle}>{l.title}</Text>
            <Text style={s.linkSub}>{l.sub}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.server}>Connected to {API_URL}</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { alignItems: 'center', paddingTop: 22, gap: 6 },
  avatarRing: { padding: 5, borderRadius: 50, backgroundColor: brand.blush },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, color: '#FFFFFF' },
  name: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.ink, marginTop: 4, textAlign: 'center' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E3F4E8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  roleText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ok },
  contact: { gap: 4, alignItems: 'center', marginTop: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 10 },
  panelTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  links: { flexDirection: 'row', gap: 10 },
  link: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  linkTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginTop: 2 },
  linkSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  server: { textAlign: 'center', fontFamily: fonts.body, fontSize: 11, color: colors.muted },
});
