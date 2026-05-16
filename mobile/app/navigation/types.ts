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

export type PlanGenerationStackParamList = {
  PlanGeneration: undefined;
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
  programId?: string;
  programDayId?: string;
};

export type WorkoutCountdownParams = {
  weekLabel: string;
  dayLabel: string;
  dayTitle: string;
  firstExerciseName: string;
};

export type RestTimerParams = {
  exerciseIndex: number;
  totalExercises: number;
  currentSet: number;
  totalSets: number;
  nextExerciseName: string;
  restDuration: number;
};

export type CardioTimerParams = {
  exerciseName: string;
  exerciseCategory: string;
  exerciseIndex: number;
  totalExercises: number;
  duration: number;
  idealTime?: string;
  topTime?: string;
  slideFrom?: "left" | "right";
};

export type TimerLogParams = {
  exerciseName: string;
  exerciseCategory: string;
  exerciseIndex: number;
  totalExercises: number;
  setCount: number;
  currentSet?: number; // 0-based, which set to start on
  idealTime?: string;
  topTime?: string;
  slideFrom?: "left" | "right";
};

export type WorkoutLogParams = {
  exerciseName: string;
  exerciseCategory: string;
  exerciseIndex: number;
  totalExercises: number;
  setCount: number;
  showWeight?: boolean;
  currentSet?: number; // 0-based, which set to start on
  slideFrom?: "left" | "right";
};

export type HomeStackParamList = {
  HomeTabs: NavigatorScreenParams<HomeTabParamList> | undefined;
  Setting: undefined;
  Profile: undefined;
  Notification: undefined;
  WorkoutPlan: WorkoutPlanParams | undefined;
  ExerciseList: WorkoutPlanParams | undefined;
  WorkoutCountdown: WorkoutCountdownParams;
  WorkoutLog: WorkoutLogParams;
  RestTimer: RestTimerParams;
  TimerLog: TimerLogParams;
  CardioTimer: CardioTimerParams;
  Points: undefined;
  SessionComplete: {
    programTitle: string;
    weekNumber: number;
    dayNumber: number;
    sessionDuration: string;
    setsLogged: number;
    eraPoints: number;
    newPRs: number;
    bonusPoints: number;
  };
  PRScreen: {
    exerciseName: string;
    exerciseCategory: string;
    weight: string;
    reps: number;
    previousBest: string;
    points: number;
  };
};

export type RootStackParamList = {
  OnboardingStack: undefined;
  AuthStack: undefined;
  PlanGenerationStack: undefined;
  HomeStack: undefined;
};
