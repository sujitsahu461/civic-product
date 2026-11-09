import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Button, ErrorText, Field, IconBubble, Kicker, Notice, Screen, ScreenHeader, notify } from '../components/ui';
import type { IconName } from '../components/brand';
import { SlideToConfirm } from '../components/SlideToConfirm';
import { useSession } from '../state/SessionContext';
import { useConnectivity } from '../state/ConnectivityContext';
import { brand, fonts } from '../brand';
import { categories, categoryMeta, colors } from '../theme';
import { saveDraft } from '../drafts';
import type { ApiError } from '../api/client';
import type { NewComplaint } from '../api/types';

const priorities = [
  { value: '', label: 'Auto' }, { value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' }, { value: 'URGENT', label: 'Urgent' },
];
const MAX_PHOTOS = 5;

/** One-tap starting points. They only fill the form; everything stays editable. */
const PRESETS: { icon: IconName; label: string; category: string; title: string; description: string }[] = [
  {
    icon: 'construct-outline', label: 'Deep pothole', category: 'ROAD',
    title: 'Deep pothole on the road',
    description: 'A deep pothole on this road is making it unsafe for vehicles and people walking.',
  },
  {
    icon: 'trash-outline', label: 'Garbage dump', category: 'GARBAGE',
    title: 'Garbage piling up',
    description: 'Garbage has been dumped here and is not being cleared. It smells and attracts animals.',
  },
  {
    icon: 'water-outline', label: 'Water pipe burst', category: 'WATER',
    title: 'Burst water pipe',
    description: 'A water pipe has burst and water is being wasted on the street.',
  },
  {
    icon: 'bulb-outline', label: 'Dark street light', category: 'STREET_LIGHT',
    title: 'Street light not working',
    description: 'The street light here is not working and the road is dark at night.',
  },
];

export function ReportScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
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

  // Opened from a category tile on Home: pre-select it once.
  const preset = route.params?.category as string | undefined;
  useEffect(() => {
    if (preset) {
      setCategory(preset);
      nav.setParams({ category: undefined });
    }
  }, [preset, nav]);

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setCategory(p.category);
    setTitle(p.title);
    setDescription(p.description);
    setFields({});
    setError(null);
  };

  const locateMe = async () => {
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
        notify('Saved as a draft', 'We could not confirm that your report was sent. Check "My reports" before sending it again. Your text is saved in Drafts.');
        nav.navigate('Drafts');
      } else {
        setError(err.message);
        setFields(err.fields ?? {});
      }
    } finally {
      setBusy(false);
    }
  };

  const camera = Platform.OS !== 'web';
  const full = photos.length >= MAX_PHOTOS;

  return (
    <Screen>
      <ScreenHeader title="Report an issue" subtitle="Goes straight to your municipality's redressal cell" />
      {!online && <Notice icon="cloud-offline-outline" tone="maroon" text="You appear to be offline. If sending fails, your report is saved as a draft." />}

      <Kicker>QUICK START</Kicker>
      <View style={s.grid}>
        {PRESETS.map((p) => (
          <Pressable key={p.label} accessibilityRole="button" accessibilityHint="Fills in the form" onPress={() => applyPreset(p)} style={({ pressed }) => [s.preset, pressed && s.pressed]}>
            <Ionicons name={p.icon} size={20} color={colors.kesari} />
            <Text style={s.presetText} numberOfLines={1}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <Step n={1} title="What kind of problem?" />
      <View style={s.grid}>
        {categories.map((c) => {
          const on = category === c.value;
          return (
            <Pressable
              key={c.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setCategory(on ? '' : c.value)}
              style={[s.cat, on && s.catOn]}
            >
              <Ionicons name={(categoryMeta[c.value]?.icon ?? 'ellipse-outline') as IconName} size={20} color={on ? colors.maroon : colors.muted} />
              <Text style={[s.catText, on && { color: colors.maroon, fontFamily: fonts.bold }]} numberOfLines={1}>{c.label}</Text>
              {on && <Ionicons name="checkmark-circle" size={18} color={colors.maroon} />}
            </Pressable>
          );
        })}
      </View>
      <Text style={s.hint}>Not sure? Leave it empty and we pick one from your description.</Text>

      <Step n={2} title="Describe it" />
      <Field icon="create-outline" label="What is the problem?" value={title} onChangeText={setTitle} placeholder="e.g. Deep pothole near the market" maxLength={200} error={fields.title} />
      <Field label="Details" value={description} onChangeText={setDescription} multiline placeholder="What is wrong, how long it has been there, any danger" error={fields.description} />
      <View style={{ gap: 8 }}>
        <Text style={s.smallLabel}>How urgent?</Text>
        <View style={s.seg} accessibilityRole="radiogroup">
          {priorities.map((p) => {
            const on = priority === p.value;
            return (
              <Pressable
                key={p.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setPriority(p.value)}
                style={[s.segItem, on && s.segOn]}
              >
                <Text style={[s.segText, on && s.segTextOn]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Step n={3} title="Photo evidence" right={`${photos.length}/${MAX_PHOTOS} · optional`} />
      <View style={s.photoRow}>
        {camera && (
          <PhotoTile icon="camera-outline" title="Camera" sub="Take a photo now" tint={brand.kesariSoft} disabled={full} onPress={() => addPhotos(true)} />
        )}
        <PhotoTile icon="images-outline" title="Gallery" sub="Choose from your photos" tint="#E1ECF9" disabled={full} onPress={() => addPhotos(false)} />
      </View>
      {photos.length > 0 && (
        <View style={s.thumbs}>
          {photos.map((p, i) => (
            <View key={p.uri + i}>
              <Image source={{ uri: p.uri }} style={s.thumb} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${i + 1}`}
                onPress={() => setPhotos((cur) => cur.filter((_, j) => j !== i))}
                style={s.remove}
                hitSlop={6}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Step n={4} title="Where is it?" />
      <View style={s.locCard}>
        <Field icon="location-outline" label="Address or landmark" value={address} onChangeText={setAddress} placeholder="Street, landmark, ward" error={fields.location_address} />
        <View style={s.locRow}>
          <IconBubble icon="navigate-outline" size={34} tint={coords ? '#E3F4E8' : brand.sand} color={coords ? colors.ok : colors.maroon} />
          <Text style={s.locText}>
            {coords ? `${coords.lat.toFixed(5)}°N, ${coords.lng.toFixed(5)}°E` : 'No map location yet'}
          </Text>
          <Button kind="soft" title={coords ? 'Update' : 'Use my location'} onPress={locateMe} busy={locBusy} style={{ minWidth: 130 }} />
        </View>
      </View>

      <ErrorText>{error}</ErrorText>
      <SlideToConfirm label="Slide to submit report" busyLabel="Sending your report…" onConfirm={submit} busy={busy} />
      <Text style={s.foot}>You get a tracking code as soon as it is filed.</Text>
    </Screen>
  );
}

function Step({ n, title, right }: { n: number; title: string; right?: string }) {
  return (
    <View style={s.step}>
      <View style={s.stepNum}>
        <Text style={s.stepNumText}>{n}</Text>
      </View>
      <Text style={s.stepTitle} accessibilityRole="header">{title}</Text>
      {!!right && <Text style={s.stepRight}>{right}</Text>}
    </View>
  );
}

function PhotoTile({ icon, title, sub, tint, disabled, onPress }: {
  icon: IconName; title: string; sub: string; tint: string; disabled?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [s.photoTile, disabled && { opacity: 0.5 }, pressed && s.pressed]}
    >
      <IconBubble icon={icon} size={46} tint={tint} color={colors.maroon} />
      <Text style={s.photoTitle}>{title}</Text>
      <Text style={s.photoSub}>{sub}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  preset: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  presetText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
  stepTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  stepRight: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  cat: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  catOn: { borderColor: colors.maroon, backgroundColor: brand.blush },
  catText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: -4 },
  smallLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  seg: { flexDirection: 'row', backgroundColor: brand.sand, borderRadius: 14, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  segOn: { backgroundColor: '#FFFFFF', boxShadow: '0px 2px 8px rgba(92, 21, 32, 0.12)' },
  segText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  segTextOn: { fontFamily: fonts.bold, color: colors.maroon },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoTile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D9CBB5',
    backgroundColor: '#FFFFFF',
  },
  photoTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginTop: 4 },
  photoSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 76, height: 76, borderRadius: 14 },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  locCard: { gap: 12, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 14 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  foot: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: -4 },
});
