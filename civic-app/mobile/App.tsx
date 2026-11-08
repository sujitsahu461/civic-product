import { SafeAreaProvider } from 'react-native-safe-area-context';
import NativeApp from './NativeApp';
import WebsiteShell from './src/screens/WebsiteShell';

const APP_MODE = process.env.EXPO_PUBLIC_CIVICSETU_APP_MODE?.trim().toLowerCase() || 'website';

export default function App() {
  if (APP_MODE === 'native') return <NativeApp />;
  return <SafeAreaProvider><WebsiteShell /></SafeAreaProvider>;
}
