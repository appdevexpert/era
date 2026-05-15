import WorkoutPlanHeader from "@/app/components/navigation/WorkoutPlanHeader";
import ExerciseListScreen from "@/app/screen/home/ExerciseListScreen";
import NotificationScreen from "@/app/screen/home/NotificationScreen";
import ProfileScreen from "@/app/screen/home/ProfileScreen";
import SettingScreen from "@/app/screen/home/SettingScreen";
import CardioTimerScreen from "@/app/screen/home/CardioTimerScreen";
import PointsScreen from "@/app/screen/home/PointsScreen";
import SessionCompleteScreen from "@/app/screen/home/SessionCompleteScreen";
import PRScreen from "@/app/screen/home/PRScreen";
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
      name="WorkoutCountdown"
      component={WorkoutCountdownScreen}
    />
    <Stack.Screen
      name="WorkoutLog"
      component={WorkoutLogScreen}
    />
    <Stack.Screen
      name="RestTimer"
      component={RestTimerScreen}
    />
    <Stack.Screen
      name="TimerLog"
      component={TimerLogScreen}
    />
    <Stack.Screen
      name="CardioTimer"
      component={CardioTimerScreen}
    />
    <Stack.Screen
      name="Points"
      component={PointsScreen}
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
  </Stack.Navigator>
);

export default HomeNavigator;
