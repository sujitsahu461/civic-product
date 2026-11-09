import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';

/** Small secrets (tokens). SecureStore on a phone; localStorage in the browser preview. */
export const secure = {
  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    } catch {
      /* storage unavailable: the session just won't persist */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  },
};

/** Larger, non-secret data (offline drafts). A JSON file on a phone; localStorage in the browser preview. */
export const files = {
  async read(name: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return globalThis.localStorage?.getItem(name) ?? null;
      const path = `${FileSystem.documentDirectory}${name}`;
      const info = await FileSystem.getInfoAsync(path);
      return info.exists ? await FileSystem.readAsStringAsync(path) : null;
    } catch {
      return null;
    }
  },
  async write(name: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(name, value);
      return;
    }
    await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}${name}`, value);
  },
};
