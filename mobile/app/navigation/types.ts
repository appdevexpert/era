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
  Workout: undefined;
  Training: undefined;
  Meal: undefined;
  Stats: undefined;
};

export type MuscleGroup =
  | "chest"
  | "shoulders"
  | "arm"
  | "abs"
  | "leg"
  | "front";

export type WorkoutPlanParams = {
  subtitle?: string;
  title?: string;
  muscles?: MuscleGroup[];
};

export type HomeStackParamList = {
  HomeTabs: NavigatorScreenParams<HomeTabParamList> | undefined;
  Setting: undefined;
  Notification: undefined;
  WorkoutPlan: WorkoutPlanParams | undefined;
  ExerciseList: WorkoutPlanParams | undefined;
};

export type RootStackParamList = {
  OnboardingStack: undefined;
  AuthStack: undefined;

  HomeStack: undefined;
};
