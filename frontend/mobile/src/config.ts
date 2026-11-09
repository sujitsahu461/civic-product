import { Platform } from 'react-native';

/**
 * Base address of the CivicSetu API (the Django backend, or later the mobile BFF).
 * Set EXPO_PUBLIC_CIVICSETU_API_URL in mobile/.env. Defaults:
 * - web and iOS simulator: http://127.0.0.1:8000
 * - Android emulator: http://10.0.2.2:8000 (the emulator's alias for the host computer)
 * A physical phone needs the computer's LAN address instead.
 */
const fromEnv = process.env.EXPO_PUBLIC_CIVICSETU_API_URL?.trim();

export const API_URL = (fromEnv && fromEnv.startsWith('http')
  ? fromEnv
  : Platform.OS === 'android'
  ? 'http://10.0.2.2:8000'
  : 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

