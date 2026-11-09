import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, nativeDriver } from '../brand';
import { colors } from '../theme';

const sealImage = require('../../assets/seal.png');

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Brand button that presses in slightly. primary = kesari, outline = maroon border, light = white on dark panels. */
export function BrandButton({ title, onPress, icon, busy, kind = 'primary', style }: {
  title: string; onPress: () => void; icon?: IconName; busy?: boolean; kind?: 'primary' | 'outline' | 'light'; style?: StyleProp<ViewStyle>;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const to = (v: number) => Animated.spring(press, { toValue: v, speed: 40, bounciness: 0, useNativeDriver: nativeDriver }).start();
  const fg = kind === 'primary' ? '#FFFFFF' : colors.maroon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      onPress={busy ? undefined : onPress}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      style={style}
    >
      <Animated.View
        style={[
          s.btn,
          kind === 'primary' ? s.btnPrimary : kind === 'light' ? s.btnLight : s.btnOutline,
          busy && { opacity: 0.75 },
          { transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }] },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            <Text style={[s.btnText, { color: fg }]}>{title}</Text>
            {!!icon && <Ionicons name={icon} size={18} color={fg} />}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** The CivicSetu emblem on a round white seal. */
export function Seal({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2 }, s.seal, style]}>
      <Image source={sealImage} style={{ width: size, height: size }} accessibilityIgnoresInvertColors />
    </View>
  );
}

/** "CivicSetu" set in the display face; "Setu" (bridge) picks up the accent colour. */
export function Wordmark({ size, onDark }: { size: number; onDark?: boolean }) {
  return (
    <Text
      accessibilityRole="header"
      style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.25, color: onDark ? '#FFFFFF' : colors.maroon }}
    >
      Civic<Text style={{ color: onDark ? colors.haldi : colors.kesari }}>Setu</Text>
    </Text>
  );
}

/** Fades and lifts children in after `delay` ms. With reduce motion on, they simply appear. */
export function Reveal({ delay = 0, reduce, children, style }: {
  delay?: number; reduce?: boolean | null; children: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) {
      v.setValue(1);
      return;
    }
    const a = Animated.timing(v, { toValue: 1, duration: 520, delay, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver });
    a.start();
    return () => a.stop();
  }, [reduce, delay, v]);
  return (
    <Animated.View
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

/** Soft rings in the background of the maroon panels. */
export function Halo({ size, top, left, opacity = 0.08 }: { size: number; top: number; left: number; opacity?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top, left, width: size, height: size, borderRadius: size / 2, borderWidth: size * 0.12, borderColor: colors.haldi, opacity }}
    />
  );
}

const s = StyleSheet.create({
  btn: { minHeight: 52, borderRadius: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnPrimary: { backgroundColor: colors.kesari, boxShadow: '0px 8px 18px rgba(217, 101, 11, 0.32)' },
  btnOutline: { borderWidth: 1.5, borderColor: colors.maroon, backgroundColor: 'transparent' },
  btnLight: { backgroundColor: '#FFFFFF' },
  btnText: { fontFamily: fonts.bold, fontSize: 16, letterSpacing: 0.2 },
  seal: { backgroundColor: '#FFFFFF', boxShadow: '0px 10px 28px rgba(40, 6, 12, 0.35)' },
});
