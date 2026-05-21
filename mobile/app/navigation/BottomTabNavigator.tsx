import BottomWorkoutTabBar from "@/app/components/common/BottomWorkoutTabBar";
import NutritionScreen from "@/app/screen/home/NutritionScreen";
import StatsScreen from "@/app/screen/home/StatsScreen";
import TrainingScreen from "@/app/screen/home/TrainingScreen";
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
    <Tab.Screen name="Training" component={TrainingScreen} />
    <Tab.Screen name="Nutrition" component={NutritionScreen} />
    <Tab.Screen name="Stats" component={StatsScreen} />
  </Tab.Navigator>
);

export default BottomTabNavigator;
