import { NavigatorScreenParams } from "@react-navigation/native";

export type OnboardingStackParamList = {
  GetStarted: undefined;
  Setting: undefined;
  Onboarding: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  CreateAccount: undefined;
  ForgotPassword: undefined;
};

export type HomeTabParamList = {
  Tab1: undefined;
  Tab2: undefined;
  Tab3: undefined;
  Tab4: undefined;
};

export type HomeStackParamList = {
  HomeTabs: NavigatorScreenParams<HomeTabParamList> | undefined;
  Setting: undefined;
  Notification: undefined;
};

export type RootStackParamList = {
  OnboardingStack: undefined;
  AuthStack: undefined;

  HomeStack: undefined;
};
