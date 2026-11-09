import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import NativeApp from './NativeApp';

// Keep the native splash (seal on maroon, see app.json) up until the animated splash takes over.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 200 });

// Browser preview: no edge glow or bounce when a list is scrolled past its end (phones use overScrollMode="never").
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('no-overscroll')) {
  const style = document.createElement('style');
  style.id = 'no-overscroll';
  style.textContent = 'html, body, #root, #root * { overscroll-behavior: none; }';
  document.head.appendChild(style);
}

// The citizen app is native. (The old "website in a WebView" mode was removed: the real website is
// served by the backend and the app now talks to the API directly.)
export default function App() {
  return (
    <SafeAreaProvider>
      <NativeApp />
    </SafeAreaProvider>
  );
}
