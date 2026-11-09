import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { RozhaOne_400Regular } from '@expo-google-fonts/rozha-one';
import {
  Mukta_400Regular,
  Mukta_500Medium,
  Mukta_600SemiBold,
  Mukta_700Bold,
  Mukta_800ExtraBold,
} from '@expo-google-fonts/mukta';

/**
 * Brand type for the welcome, sign-in and sign-up screens.
 * Rozha One (display) and Mukta (text) are both Indian typefaces that also cover Devanagari.
 * With custom fonts, pick the weight through the family name, not fontWeight.
 */
export const fonts = {
  display: 'RozhaOne_400Regular',
  body: 'Mukta_400Regular',
  medium: 'Mukta_500Medium',
  semibold: 'Mukta_600SemiBold',
  bold: 'Mukta_700Bold',
  heavy: 'Mukta_800ExtraBold',
};

/** Extra tones around the shared palette in theme.ts. */
export const brand = {
  maroonDeep: '#5C1520',
  blush: '#F6E3E5',
  blushMuted: '#D9B3B8',
  sand: '#F3EADB',
  haldiSoft: '#FDF0C4',
  kesariSoft: '#FFE8D6',
};

/** Loads the brand fonts. Returns true once they are ready, or if loading failed (then system fonts are used). */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts({
    RozhaOne_400Regular,
    Mukta_400Regular,
    Mukta_500Medium,
    Mukta_600SemiBold,
    Mukta_700Bold,
    Mukta_800ExtraBold,
  });
  return loaded || !!error;
}

/** The phone's "reduce motion" setting. null until known. */
export function useReducedMotion(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduce(v))
      .catch(() => alive && setReduce(false));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** Animated's native driver is not available in the browser preview. */
export const nativeDriver = Platform.OS !== 'web';
