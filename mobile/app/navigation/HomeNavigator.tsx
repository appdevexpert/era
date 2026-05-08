import WorkoutPlanHeader from "@/app/components/navigation/WorkoutPlanHeader";
import ExerciseListScreen from "@/app/screen/home/ExerciseListScreen";
import NotificationScreen from "@/app/screen/home/NotificationScreen";
import SettingScreen from "@/app/screen/home/SettingScreen";
import WorkoutPlanScreen from "@/app/screen/home/WorkoutPlanScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabNavigator from "./BottomTabNavigator";
import { HomeStackParamList } from "./types";

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="HomeTabs" component={BottomTabNavigator} />
    <Stack.Screen name="Setting" component={SettingScreen} />
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
  </Stack.Navigator>
);

export default HomeNavigator;
