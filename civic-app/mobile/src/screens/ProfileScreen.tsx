import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, ErrorText, Field, Screen, Title, notify } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { API_URL } from '../config';
import { colors } from '../theme';
import type { ApiError } from '../api/client';

export function ProfileScreen() {
  const { api, user, setUser, signOut } = useSession();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) { setFullName(user.full_name); setPhone(user.phone ?? ''); setAddress(user.address); setBio(user.bio); }
  }, [user]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setFields({});
    try {
      setUser(await api.updateProfile({ full_name: fullName.trim(), phone: phone.trim(), address: address.trim(), bio: bio.trim() }));
      notify('Saved', 'Your profile was updated.');
    } catch (e) {
      setError((e as Error).message);
      setFields((e as ApiError).fields ?? {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>Profile</Title>
      <Text style={{ color: colors.muted }}>{user?.email}</Text>
      <Card>
        <ErrorText>{error}</ErrorText>
        <Field label="Full name" value={fullName} onChangeText={setFullName} error={fields.full_name} />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={fields.phone} />
        <Field label="Address" value={address} onChangeText={setAddress} error={fields.address} />
        <Field label="About you" value={bio} onChangeText={setBio} multiline error={fields.bio} />
        <Button title="Save changes" onPress={save} busy={busy} />
      </Card>
      <Button kind="secondary" title="Sign out" onPress={signOut} />
      <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>Connected to {API_URL}</Text>
    </Screen>
  );
}
