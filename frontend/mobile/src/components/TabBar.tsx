import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fonts } from '../brand';
import { colors } from '../theme';
import type { IconName } from './brand';

const ICONS: Record<string, [IconName, IconName]> = {
  Home: ['home', 'home-outline'],
  Complaints: ['document-text', 'document-text-outline'],
  Track: ['search', 'search-outline'],
  Profile: ['person', 'person-outline'],
};

/** Bottom bar: four tabs around a raised "+" button for reporting a problem. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key].options.title ?? route.name;
        const go = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        if (route.name === 'Report') {
          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel="Report a problem" accessibilityState={{ selected: focused }} onPress={go} style={s.item}>
              <View style={s.fab}>
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </View>
              <Text style={[s.label, s.fabLabel, focused && { color: colors.kesari }]}>{label}</Text>
            </Pressable>
          );
        }

        const [on, off] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
        return (
          <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }} onPress={go} style={s.item}>
            <Ionicons name={focused ? on : off} size={23} color={focused ? colors.maroon : colors.muted} />
            <Text style={[s.label, focused && s.labelOn]}>{label}</Text>
            <View style={[s.dot, focused && { backgroundColor: colors.maroon }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
    boxShadow: '0px -6px 20px rgba(92, 21, 32, 0.06)',
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  labelOn: { fontFamily: fonts.bold, color: colors.maroon },
  dot: { width: 18, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginTop: 2 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: -30,
    backgroundColor: colors.kesari,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
    boxShadow: '0px 8px 18px rgba(217, 101, 11, 0.35)',
  },
  fabLabel: { fontFamily: fonts.bold, color: colors.ink, marginBottom: 5 },
});
