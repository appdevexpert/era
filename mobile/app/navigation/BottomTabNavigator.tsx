import Tab1Screen from "@/app/screen/home/Tab1Screen";
import Tab2Screen from "@/app/screen/home/Tab2Screen";
import Tab3Screen from "@/app/screen/home/Tab3Screen";
import Tab4Screen from "@/app/screen/home/Tab4Screen";
import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";
import { Platform } from "react-native";
import { HomeTabParamList } from "./types";

const Tab = createNativeBottomTabNavigator<HomeTabParamList>();

const nativeTabIcon = (source: number) =>
  Platform.select({
    ios: undefined,
    android: {
      type: "image" as const,
      source,
    },
  });

const BottomTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        display: "none",
      },
    }}
  >
    <Tab.Screen
      name="Tab1"
      component={Tab1Screen}
      options={{
        title: "Home",
        tabBarLabel: Platform.OS === "ios" ? undefined : "Home",
        tabBarSystemItem: "featured",
        tabBarIcon: nativeTabIcon(require("../../assets/images/icon.png")),
      }}
    />
    <Tab.Screen
      name="Tab2"
      component={Tab2Screen}
      options={{
        title: "Search",
        tabBarLabel: Platform.OS === "ios" ? undefined : "Search",
        tabBarSystemItem: "search",
        tabBarIcon: nativeTabIcon(require("../../assets/images/react-logo.png")),
      }}
    />
    <Tab.Screen
      name="Tab3"
      component={Tab3Screen}
      options={{
        title: "Favorites",
        tabBarLabel: Platform.OS === "ios" ? undefined : "Favorites",
        tabBarSystemItem: "favorites",
        tabBarIcon: nativeTabIcon(require("../../assets/images/partial-react-logo.png")),
      }}
    />
    <Tab.Screen
      name="Tab4"
      component={Tab4Screen}
      options={{
        title: "More",
        tabBarLabel: Platform.OS === "ios" ? undefined : "More",
        tabBarSystemItem: "more",
        tabBarIcon: nativeTabIcon(require("../../assets/images/android-icon-monochrome.png")),
      }}
    />
  </Tab.Navigator>
);

export default BottomTabNavigator;
