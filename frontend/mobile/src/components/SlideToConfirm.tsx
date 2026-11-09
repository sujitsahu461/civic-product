import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useReducedMotion } from '../brand';
import { colors } from '../theme';

const KNOB = 52;
const PAD = 4;

/**
 * Slide-to-confirm bar: drag the knob to the end to run `onConfirm`. Letting go early springs it back,
 * so a stray tap can't send anything. Screen readers get a plain "activate" action instead of dragging.
 */
export function SlideToConfirm({ label, busyLabel = 'Sending…', onConfirm, busy, disabled }: {
  label: string; busyLabel?: string; onConfirm: () => void | Promise<void>; busy?: boolean; disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [running, setRunning] = useState(false);
  const x = useRef(new Animated.Value(0)).current;
  const hint = useRef(new Animated.Value(0)).current;

  const max = Math.max(0, width - KNOB - PAD * 2);
  // PanResponder is created once, so it reads live values through refs.
  const live = useRef({ max, onConfirm, locked: false });
  live.current.max = max;
  live.current.onConfirm = onConfirm;
  live.current.locked = !!busy || !!disabled || running;

  const springBack = () => Animated.spring(x, { toValue: 0, friction: 7, tension: 70, useNativeDriver: false }).start();

  const confirm = async () => {
    if (live.current.locked) return;
    setRunning(true);
    Animated.timing(x, { toValue: live.current.max, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    try {
      await live.current.onConfirm();
    } finally {
      setRunning(false);
      springBack();
    }
  };
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !live.current.locked,
        onMoveShouldSetPanResponder: (_, g) => !live.current.locked && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => x.stopAnimation(),
        onPanResponderMove: (_, g) => x.setValue(Math.min(Math.max(0, g.dx), live.current.max)),
        onPanResponderRelease: (_, g) => {
          if (live.current.max > 0 && g.dx >= live.current.max * 0.85) confirmRef.current();
          else springBack();
        },
        onPanResponderTerminate: () => springBack(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Idle hint: the chevrons drift right, inviting a slide. Off when "reduce motion" is on.
  useEffect(() => {
    if (reduce || reduce === null) {
      hint.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hint, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(hint, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.delay(250),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, hint]);

  const sending = busy || running;
  const fade = x.interpolate({ inputRange: [0, Math.max(1, max * 0.6)], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View
      style={[s.track, disabled && { opacity: 0.55 }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Slide the handle to the right to confirm"
      accessibilityState={{ disabled: !!disabled, busy: sending }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && confirm()}
    >
      {/* the bar that fills behind the knob as it slides */}
      <Animated.View style={[s.fill, { width: Animated.add(x, KNOB + PAD * 2) }]} />

      <Animated.View pointerEvents="none" style={[s.labelWrap, { opacity: sending ? 1 : fade }]}>
        <Text style={s.label}>{sending ? busyLabel : label}</Text>
        {!sending && (
          <Animated.View
            style={{
              flexDirection: 'row',
              opacity: hint.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.35] }),
              transform: [{ translateX: hint.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }],
            }}
          >
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.9)" />
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" style={{ marginLeft: -9 }} />
          </Animated.View>
        )}
      </Animated.View>

      <Animated.View {...pan.panHandlers} style={[s.knob, Platform.OS === 'web' && s.grab, { transform: [{ translateX: x }] }]}>
        {sending ? <ActivityIndicator color={colors.kesari} /> : <Ionicons name="arrow-forward" size={24} color={colors.kesari} />}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    height: KNOB + PAD * 2,
    borderRadius: (KNOB + PAD * 2) / 2,
    backgroundColor: colors.kesari,
    padding: PAD,
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0px 8px 18px rgba(217, 101, 11, 0.28)',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: (KNOB + PAD * 2) / 2, backgroundColor: colors.maroon },
  labelWrap: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingLeft: KNOB },
  label: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF', letterSpacing: 0.2 },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 3px 10px rgba(92, 21, 32, 0.25)',
  },
  grab: { cursor: 'grab' } as object,
});
