import React, { useState } from 'react';
import { Button, ErrorText, Field, Screen, Sub, Title } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { ComplaintView } from './ComplaintDetailsScreen';
import type { ComplaintDetail, HistoryEntry } from '../api/types';

export function TrackScreen() {
  const { api } = useSession();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<{ c: ComplaintDetail; t: HistoryEntry[] } | null>(null);

  const search = async () => {
    if (!code.trim()) return setError('Enter a tracking code such as CMP-20261105-AB12.');
    setBusy(true);
    setError(null);
    setFound(null);
    try {
      const c = await api.track(code);
      const t = await api.timeline(c.public_id);
      setFound({ c, t });
    } catch (e) {
      setError((e as { status?: number }).status === 404 ? 'No complaint found with that code. Check it and try again.' : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>Track a complaint</Title>
      <Sub>Enter the code you received when you filed the complaint.</Sub>
      <Field label="Tracking code" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="CMP-YYYYMMDD-XXXX" />
      <Button title="Find complaint" onPress={search} busy={busy} />
      <ErrorText>{error}</ErrorText>
      {found && <ComplaintView c={found.c} timeline={found.t} />}
    </Screen>
  );
}
