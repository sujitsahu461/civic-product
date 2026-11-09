import { SafeAreaProvider } from 'react-native-safe-area-context';
import NativeApp from './NativeApp';

// The citizen app is native. (The old "website in a WebView" mode was removed: the real website is
// served by the backend and the app now talks to the API directly.)
export default function App() {
  return (
    <SafeAreaProvider>
      <NativeApp />
    </SafeAreaProvider>
  );
}
