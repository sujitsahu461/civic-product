import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import { Button, ErrorText, Field, IconBubble, Kicker, Notice, Screen, ScreenHeader, notify } from '../components/ui';
import type { IconName } from '../components/brand';
import { useSession } from '../state/SessionContext';
import { useConnectivity } from '../state/ConnectivityContext';
import { brand, fonts } from '../brand';
import { categories, categoryMeta, colors } from '../theme';
import { saveDraft } from '../drafts';
import type { ApiError } from '../api/client';
import type { NewComplaint } from '../api/types';
import ReportMap from '../components/ReportMap';

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
  const [locationSearch, setLocationSearch] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<NonNullable<NewComplaint['photos']>>([]);
  const [audio, setAudio] = useState<NewComplaint['audio']>();
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [video, setVideo] = useState<NewComplaint['video']>();
  const [busy, setBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState<{ trackingCode: string; publicId: string } | null>(null);

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

  const updateLocation = useCallback(async (nextCoords: { lat: number; lng: number }) => {
    setCoords(nextCoords);
    let locationLabel = `${nextCoords.lat.toFixed(5)}°N, ${nextCoords.lng.toFixed(5)}°E`;
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: nextCoords.lat, longitude: nextCoords.lng });
      const text = [place?.name, place?.street, place?.district ?? place?.city, place?.region].filter(Boolean).join(', ');
      if (text) locationLabel = text;
    } catch {
      // Coordinates remain a valid location when reverse geocoding is unavailable.
    }
    setAddress(locationLabel);
  }, []);

  const locateMe = async () => {
    setLocBusy(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return setError('Location permission was denied. Allow location access and try again.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await updateLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setError('Could not get your location. Check that location access is enabled and try again.');
    } finally {
      setLocBusy(false);
    }
  };

  const searchLocation = async (value = locationSearch) => {
    const query = value.trim();
    if (!query) return setError('Enter a place, street, or landmark to search.');
    setSearchBusy(true);
    setError(null);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Location search failed');
      const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
      const result = results[0];
      if (!result) return setError('No matching place found. Try a nearby street or landmark.');
      setCoords({ lat: Number(result.lat), lng: Number(result.lon) });
      setAddress(result.display_name);
    } catch {
      setError('Could not search that place. Check your connection and try again.');
    } finally {
      setSearchBusy(false);
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

  const addVideo = async () => {
    setError(null);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    if (asset) {
      setVideo({ uri: asset.uri, name: asset.fileName ?? `video_${Date.now()}.mp4`, type: asset.mimeType ?? 'video/mp4' });
    }
  };

  const toggleRecording = async () => {
    setError(null);
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      setRecording(null);
      if (uri) {
        setAudio({ uri, name: `audio_${Date.now()}.m4a`, type: 'audio/m4a' });
        setAudioDuration('durationMillis' in status && status.durationMillis ? status.durationMillis / 1000 : null);
      }
      return;
    }
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) return setError('Microphone permission was denied.');
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const next = new Audio.Recording();
    await next.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await next.startAsync();
    setRecording(next);
  };

  const submit = async () => {
    setError(null);
    setFields({});
    if (title.trim().length < 5) return setError('Give your report a short title (at least 5 characters).');
    if (description.trim().length < 10) return setError('Describe the problem in a few words (at least 10 characters).');
    const data: NewComplaint = {
      title: title.trim(), description: description.trim(), category: category || null, priority: priority || null,
      location_address: address.trim(), latitude: coords?.lat ?? null, longitude: coords?.lng ?? null, photos,
      audio, video, audio_duration: audioDuration,
    };

    setBusy(true);
    try {
      const created = await api.createComplaint(data);
      setTitle(''); setDescription(''); setCategory(''); setPriority(''); setAddress(''); setCoords(null); setPhotos([]); setAudio(undefined); setVideo(undefined); setAudioDuration(null);
      setLocationSearch('');
      setSubmitted({ trackingCode: created.tracking_code, publicId: created.public_id });
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

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      if (!category) return setError('Choose the type of problem.');
      if (title.trim().length < 5) return setError('Give your report a short title (at least 5 characters).');
      if (description.trim().length < 10) return setError('Describe the problem in a few words (at least 10 characters).');
    }
    if (step === 2 && !address.trim() && !coords) {
      return setError('Add an address or use your current location.');
    }
    setStep((current) => Math.min(4, current + 1));
  };

  const previousStep = () => {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  };

  const camera = Platform.OS !== 'web';
  const full = photos.length >= MAX_PHOTOS;

  return (
    <>
    <Screen>
      <ScreenHeader title="Report an issue" subtitle="Goes straight to your municipality's redressal cell" />
      {!online && <Notice icon="cloud-offline-outline" tone="maroon" text="You appear to be offline. If sending fails, your report is saved as a draft." />}

      <View style={s.progress} accessibilityRole="list">
        {(['What', 'Where', 'Proof', 'Review']).map((label, index) => {
          const number = index + 1;
          const active = step === number;
          const complete = step > number;
          return (
            <React.Fragment key={label}>
              {index > 0 && <View style={[s.progressLine, complete && s.progressLineDone]} />}
              <View style={s.progressItem}>
                <View style={[s.progressNum, (active || complete) && s.progressNumActive]}>
                  {complete ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : <Text style={s.progressNumText}>{number}</Text>}
                </View>
                <Text style={[s.progressLabel, active && s.progressLabelActive]}>{label}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {step === 1 && (
        <>
          <Kicker>QUICK START</Kicker>
          <View style={s.grid}>
            {PRESETS.map((p) => (
              <Pressable key={p.label} accessibilityRole="button" accessibilityHint="Fills in the form" onPress={() => applyPreset(p)} style={({ pressed }) => [s.preset, pressed && s.pressed]}>
                <Ionicons name={p.icon} size={20} color={colors.kesari} />
                <Text style={s.presetText} numberOfLines={1}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
          <Step n={1} title="What" right="Tell us what happened" />
          <View style={s.grid}>
            {categories.map((c) => {
              const on = category === c.value;
              return (
                <Pressable key={c.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setCategory(on ? '' : c.value)} style={[s.cat, on && s.catOn]}>
                  <Ionicons name={(categoryMeta[c.value]?.icon ?? 'ellipse-outline') as IconName} size={20} color={on ? colors.maroon : colors.muted} />
                  <Text style={[s.catText, on && { color: colors.maroon, fontFamily: fonts.bold }]} numberOfLines={1}>{c.label}</Text>
                  {on && <Ionicons name="checkmark-circle" size={18} color={colors.maroon} />}
                </Pressable>
              );
            })}
          </View>
          <Text style={s.hint}>Choose a category, then describe the issue.</Text>
          <Field icon="create-outline" label="What is the problem?" value={title} onChangeText={setTitle} placeholder="e.g. Deep pothole near the market" maxLength={200} error={fields.title} />
          <Field label="Details" value={description} onChangeText={setDescription} multiline placeholder="What is wrong, how long it has been there, any danger" error={fields.description} />
          <View style={{ gap: 8 }}>
            <Text style={s.smallLabel}>How urgent?</Text>
            <View style={s.seg} accessibilityRole="radiogroup">
              {priorities.map((p) => {
                const on = priority === p.value;
                return <Pressable key={p.value} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setPriority(p.value)} style={[s.segItem, on && s.segOn]}><Text style={[s.segText, on && s.segTextOn]}>{p.label}</Text></Pressable>;
              })}
            </View>
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <Step n={2} title="Where" right="Pin the location" />
          <View style={s.locCard}>
            <Text style={s.whereTitle}>Where is it?</Text>
            <Text style={s.mapHint}>Search for a place, use your location, or tap the map to drop the pin.</Text>
            <View style={s.searchRow}>
              <View style={s.searchInputWrap}>
                <Ionicons name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  value={locationSearch}
                  onChangeText={setLocationSearch}
                  onSubmitEditing={() => { void searchLocation(); }}
                  placeholder="Search a place, street or landmark"
                  placeholderTextColor="#A5A9B2"
                  style={s.searchInput}
                  returnKeyType="search"
                />
                <Button kind="secondary" title="Search" onPress={searchLocation} busy={searchBusy} style={s.searchButton} />
              </View>
              <Button kind="soft" title="Use my location" icon="locate-outline" onPress={locateMe} busy={locBusy} style={s.locationButton} />
            </View>
            <View style={s.locationChips}>
              {['Modipara', 'Whole India', 'Sambalpur', 'Bhubaneswar'].map((place) => (
                <Pressable key={place} onPress={() => { setLocationSearch(place); void searchLocation(place); }} style={[s.locationChip, place === 'Modipara' && s.locationChipActive]}>
                  <Text style={[s.locationChipText, place === 'Modipara' && s.locationChipTextActive]}>{place}</Text>
                </Pressable>
              ))}
            </View>
            <ReportMap coords={coords} onChange={updateLocation} />
            {!!address && <View style={s.resolvedAddress}><Ionicons name="location-outline" size={18} color={colors.maroon} /><Text style={s.resolvedAddressText}>{address}</Text></View>}
            <Field icon="location-outline" label="Street address / landmark" value={address} onChangeText={setAddress} placeholder="Include prominent landmarks, street names, or ward numbers." error={fields.location_address} />
            <View style={s.locRow}>
              <IconBubble icon="navigate-outline" size={34} tint={coords ? '#E3F4E8' : brand.sand} color={coords ? colors.ok : colors.maroon} />
              <Text style={s.locText}>{coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'No location selected'}</Text>
            </View>
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <Step n={3} title="Proof" right={`${photos.length}/${MAX_PHOTOS} · optional`} />
          <Text style={s.hint}>Add photos that help the municipality understand the issue.</Text>
          <View style={s.photoRow}>
            {camera && <PhotoTile icon="camera-outline" title="Camera" sub="Take a photo now" tint={brand.kesariSoft} disabled={full} onPress={() => addPhotos(true)} />}
            <PhotoTile icon="images-outline" title="Gallery" sub="Choose from your photos" tint="#E1ECF9" disabled={full} onPress={() => addPhotos(false)} />
          </View>
          <View style={s.photoRow}>
            <PhotoTile icon="videocam-outline" title={video ? 'Video added' : 'Video'} sub={video ? 'Tap to replace' : 'Choose a video'} tint="#F6E3E5" onPress={addVideo} />
            <PhotoTile icon={recording ? 'stop-circle-outline' : 'mic-outline'} title={recording ? 'Stop recording' : audio ? 'Audio added' : 'Audio note'} sub={recording ? 'Recording…' : audio ? 'Tap to replace' : 'Record up to 60 seconds'} tint="#E3F4E8" onPress={toggleRecording} />
          </View>
          {photos.length > 0 && (
            <View style={s.thumbs}>
              {photos.map((p, i) => (
                <View key={p.uri + i}>
                  <Image source={{ uri: p.uri }} style={s.thumb} />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} onPress={() => setPhotos((cur) => cur.filter((_, j) => j !== i))} style={s.remove} hitSlop={6}>
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {step === 4 && (
        <>
          <Step n={4} title="Review" right="Check before sending" />
          <View style={s.reviewCard}>
            <ReviewRow label="Category" value={categories.find((c) => c.value === category)?.label ?? 'Not selected'} />
            <ReviewRow label="Title" value={title} />
            <ReviewRow label="Details" value={description} />
            <ReviewRow label="Location" value={address || (coords ? `${coords.lat.toFixed(5)}°N, ${coords.lng.toFixed(5)}°E` : 'Not added')} />
            <ReviewRow label="Proof" value={`${photos.length} photo${photos.length === 1 ? '' : 's'} attached`} />
            <ReviewRow label="Video" value={video ? 'Attached' : 'Not added'} />
            <ReviewRow label="Audio" value={audio ? `Attached${audioDuration ? ` (${Math.round(audioDuration)}s)` : ''}` : 'Not added'} />
          </View>
        </>
      )}

      <ErrorText>{error}</ErrorText>
      <View style={s.navigation}>
        {step > 1 && <Button kind="soft" title="Back" onPress={previousStep} style={s.navButton} />}
        {step < 4 ? (
          <Button kind="primary" title="Continue" onPress={nextStep} style={s.navButton} />
        ) : (
          <Button kind="primary" title="Submit report" onPress={submit} busy={busy} style={s.navButton} />
        )}
      </View>
      {step === 4 && <Text style={s.foot}>You get a tracking code as soon as it is filed.</Text>}
    </Screen>
    <SubmissionModal
      submitted={submitted}
      onClose={() => setSubmitted(null)}
      onTrack={() => {
        if (!submitted) return;
        setSubmitted(null);
        nav.navigate('Track', { code: submitted.trackingCode });
      }}
      onFileAnother={() => {
        setSubmitted(null);
        setStep(1);
      }}
    />
    </>
  );
}

function SubmissionModal({ submitted, onClose, onTrack, onFileAnother }: {
  submitted: { trackingCode: string; publicId: string } | null;
  onClose: () => void;
  onTrack: () => void;
  onFileAnother: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = React.useState(20);

  React.useEffect(() => {
    if (!submitted) return undefined;
    setSecondsLeft(20);
    const interval = setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    const timeout = setTimeout(onClose, 20000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [submitted, onClose]);

  const copy = async () => {
    if (submitted) await Clipboard.setStringAsync(submitted.trackingCode);
  };

  return (
    <Modal visible={!!submitted} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modal.backdrop}>
        <View style={modal.card}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close confirmation" onPress={onClose} style={modal.close}>
            <Ionicons name="close" size={22} color="#8B7568" />
          </Pressable>
          <View style={modal.check}>
            <Ionicons name="checkmark" size={34} color="#2E7D4F" />
          </View>
          <Text style={modal.title}>Grievance Successfully Registered!</Text>
          <Text style={modal.subtitle}>Your complaint has been logged in the municipal system.</Text>
          <View style={modal.codeBox}>
            <Text style={modal.codeLabel}>TRACKING CODE</Text>
            <View style={modal.codeRow}>
              <Text style={modal.code}>{submitted?.trackingCode}</Text>
              <Pressable accessibilityRole="button" onPress={copy} style={modal.copy}>
                <Ionicons name="copy-outline" size={15} color="#7A1F2B" />
                <Text style={modal.copyText}>Copy</Text>
              </Pressable>
            </View>
          </View>
          <View style={modal.actions}>
            <Pressable onPress={onTrack} style={[modal.action, modal.primary]}>
              <Ionicons name="search-outline" size={18} color="#FFFFFF" />
              <Text style={modal.primaryText}>Track Grievance{'\n'}Status</Text>
            </Pressable>
            <Pressable onPress={onFileAnother} style={[modal.action, modal.secondary]}>
              <Ionicons name="add" size={18} color="#7A1F2B" />
              <Text style={modal.secondaryText}>File Another Issue</Text>
            </Pressable>
          </View>
          <Text style={modal.footer}>Keep this tracking code to follow your complaint.</Text>
          <View style={modal.timerRow}>
            <ActivityIndicator size="small" color="#FF7722" />
            <Text style={modal.timer}>This confirmation closes in {secondsLeft}s</Text>
          </View>
        </View>
      </View>
    </Modal>
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.reviewRow}>
      <Text style={s.reviewLabel}>{label}</Text>
      <Text style={s.reviewValue}>{value}</Text>
    </View>
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
  map: { width: '100%', height: 190, borderRadius: 16 },
  whereTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  mapHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  searchRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  searchInputWrap: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingLeft: 12, backgroundColor: '#FFFFFF' },
  searchInput: { flex: 1, minWidth: 0, height: 46, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  searchButton: { minWidth: 76 },
  locationButton: { minWidth: 138 },
  locationChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  locationChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  locationChipActive: { backgroundColor: brand.blush, borderColor: '#E4BCC1' },
  locationChipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  locationChipTextActive: { color: colors.maroon },
  resolvedAddress: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resolvedAddressText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.ink },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  foot: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: -4 },
  progress: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 8 },
  progressItem: { alignItems: 'center', gap: 5 },
  progressNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.sand, borderWidth: 1, borderColor: colors.line },
  progressNumActive: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  progressNumText: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  progressLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  progressLabelActive: { color: colors.maroon, fontFamily: fonts.bold },
  progressLine: { flex: 1, height: 2, backgroundColor: colors.line, marginHorizontal: 5, marginTop: 13 },
  progressLineDone: { backgroundColor: colors.maroon },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  navButton: { flex: 1 },
  reviewCard: { gap: 0, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16 },
  reviewRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  reviewLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted, marginBottom: 4 },
  reviewValue: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink },
});

const modal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(42, 25, 20, 0.48)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 520, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 24, alignItems: 'center', boxShadow: '0px 10px 28px rgba(42, 25, 20, 0.22)' },
  close: { position: 'absolute', right: 14, top: 12, padding: 5 },
  check: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#E3F4E8', borderWidth: 2, borderColor: '#B7DEC3', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 16 },
  title: { fontFamily: fonts.bold, fontSize: 22, color: '#3B2418', textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: '#8B7568', textAlign: 'center', marginTop: 6, marginBottom: 18 },
  codeBox: { width: '100%', backgroundColor: '#FDECEF', borderWidth: 1, borderColor: '#F0C8CE', borderRadius: 14, padding: 14, alignItems: 'center' },
  codeLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.2, color: '#8B7568', marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  code: { fontFamily: fonts.bold, fontSize: 20, color: '#7A1F2B' },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E4BCC1', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5 },
  copyText: { fontFamily: fonts.bold, fontSize: 12, color: '#7A1F2B' },
  actions: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 18 },
  action: { flex: 1, minHeight: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, paddingHorizontal: 8 },
  primary: { backgroundColor: '#FF7722' },
  secondary: { backgroundColor: '#FFF6F6', borderWidth: 1, borderColor: '#E4BCC1' },
  primaryText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF', textAlign: 'center' },
  secondaryText: { fontFamily: fonts.bold, fontSize: 13, color: '#7A1F2B', textAlign: 'center' },
  footer: { fontFamily: fonts.body, fontSize: 12, color: '#8B7568', marginTop: 16, textAlign: 'center' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  timer: { fontFamily: fonts.body, fontSize: 12, color: '#8B7568' },
});
