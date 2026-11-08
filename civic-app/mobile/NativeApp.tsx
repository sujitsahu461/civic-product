import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
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
import { SessionProvider, useSession } from './src/state/SessionContext';
import { ConnectivityProvider } from './src/state/ConnectivityContext';
import { NetworkBanner } from './src/components/NetworkBanner';

export type RootStackParamList = { Main: undefined; ComplaintDetails: { publicId: string }; Track: undefined; Drafts: undefined };
const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return <View style={{ flex: 1 }}><NetworkBanner /><Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0F766E' }}><Tabs.Screen name="Home" component={HomeScreen} /><Tabs.Screen name="Report" component={ReportScreen} /><Tabs.Screen name="Complaints" component={ComplaintsScreen} /><Tabs.Screen name="Notifications" component={NotificationsScreen} /><Tabs.Screen name="Profile" component={ProfileScreen} /></Tabs.Navigator></View>;
}

function AuthenticatedApp() {
  const { loading, tokens } = useSession();
  if (loading) return null;
  if (!tokens) return <AuthScreen />;
  return <NavigationContainer><StatusBar style="dark" /><Stack.Navigator><Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} /><Stack.Screen name="ComplaintDetails" component={ComplaintDetailsScreen} options={{ title: 'Complaint details' }} /><Stack.Screen name="Track" component={TrackScreen} options={{ title: 'Track complaint' }} /><Stack.Screen name="Drafts" component={DraftsScreen} options={{ title: 'Saved drafts' }} /></Stack.Navigator></NavigationContainer>;
}

export default function NativeApp() {
  return <SafeAreaProvider><ConnectivityProvider><SessionProvider><AuthenticatedApp /></SessionProvider></ConnectivityProvider></SafeAreaProvider>;
}
