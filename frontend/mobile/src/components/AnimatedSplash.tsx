import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { brand, fonts, nativeDriver, useReducedMotion } from '../brand';
import { colors } from '../theme';
import { Halo, Seal, Wordmark } from './brand';

const SEAL = 140; // same size as the native splash image (app.json), so the hand-over is seamless

/**
 * Launch animation shown over the app: the seal settles with a gentle pulse while two rings ripple out,
 * then the name and tagline rise in. It fades away once `ready` (fonts and session loaded) is true.
 */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduce = useReducedMotion();
  // On a phone the native splash already shows the seal, so it starts fully visible there.
  const enter = useRef(new Animated.Value(Platform.OS === 'web' ? 0 : 1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      enter.setValue(1);
      words.setValue(1);
      const t = setTimeout(() => setIntroDone(true), 700);
      return () => clearTimeout(t);
    }
    const ease = Easing.out(Easing.cubic);
    const run = Animated.parallel([
      Animated.spring(enter, { toValue: 1, friction: 7, tension: 55, useNativeDriver: nativeDriver }),
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(pulse, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.timing(pulse, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      ]),
      Animated.sequence([Animated.delay(280), Animated.timing(ring1, { toValue: 1, duration: 1300, easing: ease, useNativeDriver: nativeDriver })]),
      Animated.sequence([Animated.delay(620), Animated.timing(ring2, { toValue: 1, duration: 1300, easing: ease, useNativeDriver: nativeDriver })]),
      Animated.sequence([Animated.delay(760), Animated.timing(words, { toValue: 1, duration: 640, easing: ease, useNativeDriver: nativeDriver })]),
    ]);
    run.start(({ finished }) => finished && setIntroDone(true));
    return () => run.stop();
  }, [reduce, enter, pulse, ring1, ring2, words]);

  const leaving = useRef(false);

  // Safety net: if animation frames are paused (e.g. opened in a background tab), never hold the app back.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      if (leaving.current) return;
      leaving.current = true;
      onDone();
    }, 5000);
    return () => clearTimeout(t);
  }, [ready, onDone]);

  useEffect(() => {
    if (!introDone || !ready || leaving.current) return;
    leaving.current = true;
    Animated.timing(fade, {
      toValue: 0,
      duration: reduce ? 160 : 420,
      easing: Easing.in(Easing.quad),
      useNativeDriver: nativeDriver,
    }).start(() => onDone());
  }, [introDone, ready, reduce, fade, onDone]);

  const lift = words.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const ring = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.75, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
  });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.root, { opacity: fade }]}
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
      accessibilityLabel="CivicSetu is starting"
    >
      <StatusBar style="light" />
      <Halo size={460} top={-170} left={-190} opacity={0.07} />
      <Halo size={340} top={560} left={150} opacity={0.06} />

      <Animated.View style={[s.center, { transform: [{ translateY: lift }] }]}>
        <Animated.View style={[s.ring, ring(ring1)]} />
        <Animated.View style={[s.ring, ring(ring2)]} />
        <Animated.View
          style={{
            opacity: enter,
            transform: [
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
            ],
          }}
        >
          <Seal size={SEAL} />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          s.center,
          s.words,
          { opacity: words, transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [134, 112] }) }] },
        ]}
      >
        <Wordmark size={40} onDark />
        <Text style={s.tagline}>REPORT · TRACK · RESOLVE</Text>
      </Animated.View>

      <Animated.Text style={[s.footer, { opacity: words }]}>सिविक सेतु · the civic bridge</Animated.Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: colors.maroon, overflow: 'hidden', zIndex: 10 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SEAL, height: SEAL, borderRadius: SEAL / 2, borderWidth: 2, borderColor: colors.haldi },
  words: { gap: 2 },
  tagline: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 3.2, color: brand.blushMuted },
  footer: {
    position: 'absolute',
    bottom: 42,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 13,
    color: brand.blushMuted,
    letterSpacing: 0.4,
  },
});
