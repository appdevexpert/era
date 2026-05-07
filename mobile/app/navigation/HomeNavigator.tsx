import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabNavigator from "./BottomTabNavigator";
import SettingScreen from "@/app/screen/home/SettingScreen";
import NotificationScreen from "@/app/screen/home/NotificationScreen";
import { HomeStackParamList } from "./types";

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="HomeTabs" component={BottomTabNavigator} />
    <Stack.Screen name="Setting" component={SettingScreen} />
    <Stack.Screen name="Notification" component={NotificationScreen} />
  </Stack.Navigator>
);

export default HomeNavigator;
