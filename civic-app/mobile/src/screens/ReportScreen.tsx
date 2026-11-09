import React, { useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Button, Card, Chip, ErrorText, Field, Label, Screen, Sub, Title, notify } from '../components/ui';
import { useSession } from '../state/SessionContext';
import { useConnectivity } from '../state/ConnectivityContext';
import { categories, colors } from '../theme';
import { saveDraft } from '../drafts';
import type { ApiError } from '../api/client';
import type { NewComplaint } from '../api/types';

const priorities = [
  { value: '', label: 'Auto' }, { value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' }, { value: 'URGENT', label: 'Urgent' },
];
const MAX_PHOTOS = 5;

export function ReportScreen() {
  const nav = useNavigation<any>();
  const { api, user } = useSession();
  const { online } = useConnectivity();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<NonNullable<NewComplaint['photos']>>([]);
  const [busy, setBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const useMyLocation = async () => {
    setLocBusy(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return setError('Location permission was denied. You can type the address instead.');
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (!address.trim()) {
        try {
          const [p] = await Location.reverseGeocodeAsync(pos.coords);
          const text = [p?.name, p?.street, p?.district ?? p?.city, p?.region].filter(Boolean).join(', ');
          if (text) setAddress(text);
        } catch {
          /* address lookup is optional (not available in the browser preview) */
        }
      }
    } catch {
      setError('Could not get your location. You can type the address instead.');
    } finally {
      setLocBusy(false);
    }
  };

  const addPhotos = async (camera: boolean) => {
    setError(null);
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Camera permission was denied.');
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS, quality: 0.7 });
    if (res.canceled) return;
    const next = res.assets.map((a, i) => ({
      uri: a.uri,
      name: a.fileName ?? `photo_${Date.now()}_${i}.jpg`,
      type: a.mimeType ?? 'image/jpeg',
    }));
    setPhotos((p) => [...p, ...next].slice(0, MAX_PHOTOS));
  };

  const submit = async () => {
    setError(null);
    setFields({});
    if (title.trim().length < 5) return setError('Give your report a short title (at least 5 characters).');
    if (description.trim().length < 10) return setError('Describe the problem in a few words (at least 10 characters).');
    const data: NewComplaint = {
      title: title.trim(), description: description.trim(), category: category || null, priority: priority || null,
      location_address: address.trim(), latitude: coords?.lat ?? null, longitude: coords?.lng ?? null, photos,
    };
    setBusy(true);
    try {
      const created = await api.createComplaint(data);
      setTitle(''); setDescription(''); setCategory(''); setPriority(''); setAddress(''); setCoords(null); setPhotos([]);
      notify('Report sent', `Your tracking code is ${created.tracking_code}. Keep it to follow progress.`);
      nav.navigate('ComplaintDetails', { publicId: created.public_id });
    } catch (e) {
      const err = e as ApiError;
      if (err.network && user) {
        // The outcome is unknown. Save a draft so nothing is lost, and tell the person to check before resending.
        await saveDraft(user.public_id, data, 'UNKNOWN', err.message);
        notify('Saved as a draft', 'We could not confirm that your report was sent. Check "My complaints" before sending it again. Your text is saved in Drafts.');
        nav.navigate('Drafts');
      } else {
        setError(err.message);
        setFields(err.fields ?? {});
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>Report a problem</Title>
      <Sub>Tell us what is wrong and where. Photos help the department act faster.</Sub>
      {!online && <ErrorText>You appear to be offline. If sending fails, your report is saved as a draft.</ErrorText>}
      <ErrorText>{error}</ErrorText>
      <Card>
        <Field label="What is the problem?" value={title} onChangeText={setTitle} placeholder="e.g. Deep pothole near market" maxLength={200} error={fields.title} />
        <Field label="Details" value={description} onChangeText={setDescription} multiline placeholder="Describe the problem, how long it has been there, any danger" error={fields.description} />
        <View style={{ gap: 6 }}>
          <Label>Type of problem (optional)</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((c) => (
              <Chip key={c.value} label={c.label} active={category === c.value} onPress={() => setCategory(category === c.value ? '' : c.value)} />
            ))}
          </View>
          <Text style={{ fontSize: 12, color: colors.muted }}>Not sure? Leave it empty and we pick one from your description.</Text>
        </View>
        <View style={{ gap: 6 }}>
          <Label>How urgent?</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {priorities.map((p) => <Chip key={p.value} label={p.label} active={priority === p.value} onPress={() => setPriority(p.value)} />)}
          </View>
        </View>
      </Card>
      <Card>
        <Field label="Where is it?" value={address} onChangeText={setAddress} placeholder="Street, landmark, ward" error={fields.location_address} />
        <Button kind="secondary" title={coords ? 'Location added. Update it' : 'Use my current location'} onPress={useMyLocation} busy={locBusy} />
        {coords && <Text style={{ fontSize: 12, color: colors.muted }}>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</Text>}
      </Card>
      <Card>
        <Label>Photos ({photos.length}/{MAX_PHOTOS})</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((p, i) => (
            <Image key={p.uri + i} source={{ uri: p.uri }} style={{ width: 72, height: 72, borderRadius: 8 }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button kind="secondary" title="Choose photos" onPress={() => addPhotos(false)} disabled={photos.length >= MAX_PHOTOS} /></View>
          {Platform.OS !== 'web' && (
            <View style={{ flex: 1 }}><Button kind="secondary" title="Take photo" onPress={() => addPhotos(true)} disabled={photos.length >= MAX_PHOTOS} /></View>
          )}
        </View>
        {photos.length > 0 && <Text onPress={() => setPhotos([])} style={{ color: colors.danger, fontWeight: '600' }}>Remove all photos</Text>}
      </Card>
      <Button title="Send report" onPress={submit} busy={busy} />
    </Screen>
  );
}
