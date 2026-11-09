import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Card, Empty, ErrorText, Field, Screen, ScreenHeader } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { ComplaintView } from './ComplaintDetailsScreen';
import { fonts } from '../brand';
import { colors } from '../theme';
import type { ComplaintDetail, HistoryEntry } from '../api/types';

/** Find any complaint by its code. Works signed in (a tab) and signed out (opened from the welcome screen). */
export function TrackScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { api } = useSession();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<{ c: ComplaintDetail; t: HistoryEntry[] } | null>(null);
  const inStack = nav.getState?.()?.type === 'stack';

  const search = useCallback(async (value: string) => {
    if (!value.trim()) return setError('Enter a tracking code such as CMP-20261105-AB12.');
    setBusy(true);
    setError(null);
    setFound(null);
    try {
      const c = await api.track(value);
      const t = await api.timeline(c.public_id);
      setFound({ c, t });
    } catch (e) {
      setError((e as { status?: number }).status === 404 ? 'No complaint found with that code. Check it and try again.' : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [api]);

  // Opened from a notification with a code: fill it in and look it up.
  const incoming = route.params?.code as string | undefined;
  useEffect(() => {
    if (incoming) {
      setCode(incoming);
      search(incoming);
      nav.setParams({ code: undefined });
    }
  }, [incoming, nav, search]);

  return (
    <Screen>
      <ScreenHeader
        title="Track a complaint"
        subtitle="Enter a tracking code to see its progress. No sign-in needed."
        onBack={inStack ? () => nav.goBack() : undefined}
      />
      <Card>
        <Field
          icon="search-outline"
          label="Complaint tracking code"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="CMP-YYYYMMDD-XXXX"
          returnKeyType="search"
          onSubmitEditing={() => search(code)}
        />
        <Button title="Check status" icon="arrow-forward" onPress={() => search(code)} busy={busy} />
      </Card>
      <ErrorText>{error}</ErrorText>
      {!found && !error && !busy && (
        <Empty
          icon="folder-open-outline"
          title="Enter a code to see its status"
          hint="Every report gets a permanent code starting with CMP-, shown when it is filed."
        />
      )}
      {found && (
        <View style={{ gap: 14 }}>
          <Text style={s.found}>Found it</Text>
          <ComplaintView c={found.c} timeline={found.t} />
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  found: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 2, color: colors.ok },
});
