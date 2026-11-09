import type { NavigatorScreenParams } from '@react-navigation/native';

/** Screens shown before sign-in. */
export type GuestStackParamList = {
  Landing: undefined;
  Auth: { mode: 'login' | 'register' };
  Track: undefined;
};

/** Bottom tabs after sign-in. Report can be opened with a category already chosen; Track with a code. */
export type MainTabParamList = {
  Home: undefined;
  Complaints: undefined;
  Report: { category?: string } | undefined;
  Track: { code?: string } | undefined;
  Profile: undefined;
};

/** Screens after sign-in that open on top of the tabs. */
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ComplaintDetails: { publicId: string };
  Notifications: undefined;
  Drafts: undefined;
};
