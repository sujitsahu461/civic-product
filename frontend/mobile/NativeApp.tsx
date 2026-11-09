import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens/HomeScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { ComplaintsScreen } from './src/screens/ComplaintsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { ComplaintDetailsScreen } from './src/screens/ComplaintDetailsScreen';
import { TrackScreen } from './src/screens/TrackScreen';
import { DraftsScreen } from './src/screens/DraftsScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { LandingScreen } from './src/screens/LandingScreen';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { TabBar } from './src/components/TabBar';
import { brand, useBrandFonts } from './src/brand';
import type { GuestStackParamList, MainTabParamList, RootStackParamList } from './src/navigation';
import { SessionProvider, useSession } from './src/state/SessionContext';
import { ConnectivityProvider } from './src/state/ConnectivityContext';
import { NetworkBanner } from './src/components/NetworkBanner';
import { colors } from './src/theme';

const Tabs = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const GuestStack = createNativeStackNavigator<GuestStackParamList>();

function MainTabs() {
  return (
    <View style={{ flex: 1 }}>
      <NetworkBanner />
      {/* Home, My reports, a raised "+" to report, Track and Profile (layout from the CIVIC prototype). */}
      <Tabs.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
        <Tabs.Screen name="Home" component={HomeScreen} />
        <Tabs.Screen name="Complaints" component={ComplaintsScreen} options={{ title: 'My reports' }} />
        <Tabs.Screen name="Report" component={ReportScreen} />
        <Tabs.Screen name="Track" component={TrackScreen} />
        <Tabs.Screen name="Profile" component={ProfileScreen} />
      </Tabs.Navigator>
    </View>
  );
}

/** Before sign-in: landing, sign in / create account, and public tracking. */
function GuestApp() {
  return (
    <NavigationContainer>
      <GuestStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <GuestStack.Screen name="Landing" component={LandingScreen} options={{ statusBarStyle: 'light' }} />
        <GuestStack.Screen name="Auth" component={AuthScreen} options={{ statusBarStyle: 'light', contentStyle: { backgroundColor: colors.maroon } }} />
        <GuestStack.Screen
          name="Track"
          component={TrackScreen}
          options={{ statusBarStyle: 'dark' }}
        />
      </GuestStack.Navigator>
    </NavigationContainer>
  );
}

function SignedInApp() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ComplaintDetails" component={ComplaintDetailsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Drafts" component={DraftsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// In a wide browser window the app keeps phone width, centred, instead of stretching.
const PHONE_WIDTH = 420;

/** Shows the launch animation over the app until fonts and the saved session are ready. */
function AppRoot() {
  const { loading, user } = useSession();
  const fontsReady = useBrandFonts();
  const [splash, setSplash] = useState(true);
  const hideSplash = useCallback(() => setSplash(false), []);
  const { width } = useWindowDimensions();
  const framed = Platform.OS === 'web' && width > PHONE_WIDTH + 40;
  return (
    <View style={{ flex: 1, backgroundColor: framed ? brand.sand : colors.bg }}>
      <View
        style={[
          { flex: 1, width: '100%', overflow: 'hidden', backgroundColor: splash ? colors.maroon : colors.bg },
          framed && { maxWidth: PHONE_WIDTH, alignSelf: 'center', boxShadow: '0px 0px 40px rgba(27, 37, 51, 0.14)' },
        ]}
      >
        {fontsReady && !loading && (user ? <SignedInApp /> : <GuestApp />)}
        {fontsReady && splash && <AnimatedSplash ready={!loading} onDone={hideSplash} />}
      </View>
    </View>
  );
}

export default function NativeApp() {
  return (
    <SafeAreaProvider>
      <ConnectivityProvider>
        <SessionProvider>
          <AppRoot />
        </SessionProvider>
      </ConnectivityProvider>
    </SafeAreaProvider>
  );
}
