import WorkoutPlanHeader from "@/app/components/common/WorkoutPlanHeader";
import ExerciseDetailScreen from "@/app/screen/home/ExerciseDetailScreen";
import ExerciseHistoryScreen from "@/app/screen/home/ExerciseHistoryScreen";
import ExerciseListScreen from "@/app/screen/home/ExerciseListScreen";
import ExercisePrHistoryScreen from "@/app/screen/home/ExercisePrHistoryScreen";
import PrHistoryScreen from "@/app/screen/home/PrHistoryScreen";
import TransformationGalleryScreen from "@/app/screen/home/TransformationGalleryScreen";
import NotificationScreen from "@/app/screen/home/NotificationScreen";
import PrivacyPolicyScreen from "@/app/screen/home/PrivacyPolicyScreen";
import PaywallScreen from "@/app/screen/home/PaywallScreen";
import ProfileScreen from "@/app/screen/home/ProfileScreen";
import SettingScreen from "@/app/screen/home/SettingScreen";
import TermsOfServiceScreen from "@/app/screen/home/TermsOfServiceScreen";
import CardioTimerScreen from "@/app/screen/home/CardioTimerScreen";
import LeaderboardScreen from "@/app/screen/home/LeaderboardScreen";
import LifetimeVolumeScreen from "@/app/screen/home/LifetimeVolumeScreen";
import PointsScreen from "@/app/screen/home/PointsScreen";
import SessionCompleteScreen from "@/app/screen/home/SessionCompleteScreen";
import PRScreen from "@/app/screen/home/PRScreen";
import TwelveWeekCompletionScreen from "@/app/screen/home/TwelveWeekCompletionScreen";
import WhatComesNowScreen from "@/app/screen/home/WhatComesNowScreen";
import Cycle2BeginsScreen from "@/app/screen/home/Cycle2BeginsScreen";
import TimerLogScreen from "@/app/screen/home/TimerLogScreen";
import RestTimerScreen from "@/app/screen/home/RestTimerScreen";
import WorkoutCountdownScreen from "@/app/screen/home/WorkoutCountdownScreen";
import WorkoutLogScreen from "@/app/screen/home/WorkoutLogScreen";
import WorkoutPlanScreen from "@/app/screen/home/WorkoutPlanScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabNavigator from "./BottomTabNavigator";
import { HomeStackParamList } from "./types";

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="HomeTabs" component={BottomTabNavigator} />
    <Stack.Screen name="Setting" component={SettingScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notification" component={NotificationScreen} />
    <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
    <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    <Stack.Screen
      name="WorkoutPlan"
      component={WorkoutPlanScreen}
      options={{
        headerShown: true,
        header: (props) => <WorkoutPlanHeader {...props} />,
        headerTransparent: true,
      }}
    />
    <Stack.Screen
      name="ExerciseList"
      component={ExerciseListScreen}
      options={{
        headerShown: true,
        header: (props) => <WorkoutPlanHeader {...props} />,
        headerTransparent: true,
      }}
    />
    <Stack.Screen
      name="ExerciseDetail"
      component={ExerciseDetailScreen}
      options={{
        headerShown: true,
        header: (props) => <WorkoutPlanHeader {...props} />,
        headerTransparent: true,
      }}
    />
    <Stack.Screen
      name="ExerciseHistory"
      component={ExerciseHistoryScreen}
      options={{
        headerShown: true,
        header: (props) => <WorkoutPlanHeader {...props} />,
        headerTransparent: true,
      }}
    />
    <Stack.Screen
      name="PrHistory"
      component={PrHistoryScreen}
      options={{
        headerShown: true,
        header: (props) => <WorkoutPlanHeader {...props} />,
        headerTransparent: true,
      }}
    />
    <Stack.Screen
      name="ExercisePrHistory"
      component={ExercisePrHistoryScreen}
      options={{
        headerShown: true,
        header: (props) => <WorkoutPlanHeader {...props} />,
        headerTransparent: true,
      }}
    />
    <Stack.Screen
      name="TransformationGallery"
      component={TransformationGalleryScreen}
      options={{
        headerShown: true,
        header: (props) => <WorkoutPlanHeader {...props} />,
        headerTransparent: true,
      }}
    />
    <Stack.Screen
      name="WorkoutCountdown"
      component={WorkoutCountdownScreen}
    />
    <Stack.Screen
      name="WorkoutLog"
      component={WorkoutLogScreen}
      options={({ route }) => ({
        animation: route.params?.slideFrom === "left" ? "slide_from_left" : "slide_from_right",
        // iOS swipe-back is handled natively by UIKit and pops the screen
        // before `beforeRemove` can preventDefault. Disable the native
        // gesture and let the screen render its own edge-swipe handler
        // that opens the End Workout bottom sheet instead.
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
      })}
    />
    <Stack.Screen
      name="RestTimer"
      component={RestTimerScreen}
    />
    <Stack.Screen
      name="TimerLog"
      component={TimerLogScreen}
      options={({ route }) => ({
        animation: route.params?.slideFrom === "left" ? "slide_from_left" : "slide_from_right",
      })}
    />
    <Stack.Screen
      name="CardioTimer"
      component={CardioTimerScreen}
      options={({ route }) => ({
        animation: route.params?.slideFrom === "left" ? "slide_from_left" : "slide_from_right",
      })}
    />
    <Stack.Screen
      name="Points"
      component={PointsScreen}
    />
    <Stack.Screen
      name="Leaderboard"
      component={LeaderboardScreen}
    />
    <Stack.Screen
      name="LifetimeVolume"
      component={LifetimeVolumeScreen}
    />
    <Stack.Screen
      name="SessionComplete"
      component={SessionCompleteScreen}
    />
    <Stack.Screen
      name="PRScreen"
      component={PRScreen}
      options={{ presentation: "modal", animation: "slide_from_bottom" }}
    />
    <Stack.Screen
      name="TwelveWeekCompletion"
      component={TwelveWeekCompletionScreen}
    />
    <Stack.Screen
      name="WhatComesNow"
      component={WhatComesNowScreen}
    />
    <Stack.Screen
      name="Cycle2Begins"
      component={Cycle2BeginsScreen}
    />
    <Stack.Screen
      name="Paywall"
      component={PaywallScreen}
      options={{
        headerShown: false,
        presentation: "fullScreenModal",
      }}
    />
  </Stack.Navigator>
);

export default HomeNavigator;
