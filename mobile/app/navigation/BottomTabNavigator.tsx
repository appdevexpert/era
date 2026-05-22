import BottomWorkoutTabBar from "@/app/components/common/BottomWorkoutTabBar";
import NutritionScreen from "@/app/screen/home/NutritionScreen";
import ProgressScreen from "@/app/screen/home/ProgressScreen";
import WeightsScreen from "@/app/screen/home/WeightsScreen";
import WorkoutScreen from "@/app/screen/home/WorkoutScreen";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeTabParamList } from "./types";

const Tab = createBottomTabNavigator<HomeTabParamList>();

const BottomTabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <BottomWorkoutTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Workout" component={WorkoutScreen} />
    <Tab.Screen name="Weights" component={WeightsScreen} />
    <Tab.Screen name="Nutrition" component={NutritionScreen} />
    <Tab.Screen name="Progress" component={ProgressScreen} />
  </Tab.Navigator>
);

export default BottomTabNavigator;
