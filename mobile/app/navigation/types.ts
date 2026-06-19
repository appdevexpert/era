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
  Weights: undefined;
  Nutrition: undefined;
  Progress: undefined;
};

export type PlanGenerationStackParamList = {
  PlanGeneration: undefined;
};

export type MuscleGroup =
  | "chest"
  | "shoulders"
  | "shoulder"
  | "arm"
  | "abs"
  | "leg"
  | "front"
  | "tricep"
  | "bicep"
  | "forearm"
  | "back"
  | "traps"
  | "neck"
  | "quads"
  | "glutes"
  | "hamstring"
  | "calves";

export type DayStatus = "missed" | "completed" | "future" | "active";

export type WorkoutPlanParams = {
  subtitle?: string;
  title?: string;
  muscles?: MuscleGroup[];
  programId?: string;
  programDayId?: string;
  dayStatus?: DayStatus;
};

export type ExerciseHistoryParams = {
  /** Exercise library id (required to fetch history). */
  exerciseId?: string;
  /** Exercise display name. */
  title?: string;
  /** Eyebrow text — e.g. "Back • Compound". */
  subtitle?: string;
  muscles?: MuscleGroup[];
};

export type WorkoutCountdownParams = {
  weekLabel: string;
  dayLabel: string;
  dayTitle: string;
  firstExerciseName: string;
  /** Treated as a fresh start when omitted. Resume jumps to the first
   * incomplete exercise; editMode opens an already-completed session for edits. */
  mode?: "fresh" | "resume" | "edit";
  /** 0-based exercise index to navigate to after the countdown. Defaults to 0. */
  startExerciseIndex?: number;
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
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  WorkoutPlan: WorkoutPlanParams | undefined;
  ExerciseList: WorkoutPlanParams | undefined;
  ExerciseHistory: ExerciseHistoryParams | undefined;
  PrHistory: WorkoutPlanParams | undefined;
  ExercisePrHistory: ExerciseHistoryParams | undefined;
  TransformationGallery: WorkoutPlanParams | undefined;
  WorkoutCountdown: WorkoutCountdownParams;
  WorkoutLog: WorkoutLogParams;
  RestTimer: RestTimerParams;
  TimerLog: TimerLogParams;
  CardioTimer: CardioTimerParams;
  ExerciseDetail: {
    title: string; // exercise name (shown as header title)
    subtitle: string; // "week 1 • monday" (shown as gold label)
    exerciseData: string; // JSON-serialized CompletedExerciseView
    sessionDurationMinutes?: number; // total session duration
  };
  Points: undefined;
  Leaderboard: undefined;
  SessionComplete: {
    sessionId?: string | null;
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
  TwelveWeekCompletion: undefined;
  WhatComesNow: undefined;
  Cycle2Begins: undefined;
};

export type RootStackParamList = {
  OnboardingStack: undefined;
  AuthStack: undefined;
  PlanGenerationStack: undefined;
  HomeStack: undefined;
};
