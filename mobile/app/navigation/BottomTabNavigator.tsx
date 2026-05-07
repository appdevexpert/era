import BottomWorkoutTabBar from "@/app/components/navigation/BottomWorkoutTabBar";
import Tab1Screen from "@/app/screen/home/Tab1Screen";
import Tab2Screen from "@/app/screen/home/Tab2Screen";
import Tab3Screen from "@/app/screen/home/Tab3Screen";
import Tab4Screen from "@/app/screen/home/Tab4Screen";
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
    <Tab.Screen name="Tab1" component={Tab1Screen} />
    <Tab.Screen name="Tab2" component={Tab2Screen} />
    <Tab.Screen name="Tab3" component={Tab3Screen} />
    <Tab.Screen name="Tab4" component={Tab4Screen} />
  </Tab.Navigator>
);

export default BottomTabNavigator;
