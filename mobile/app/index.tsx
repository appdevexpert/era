import "react-native-get-random-values";
// import * as Sentry from "@sentry/react-native";
import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { enableFreeze, enableScreens } from "react-native-screens";
import App from "./App";
// import { initSentry } from "./utils/sentry";

enableScreens(true);
enableFreeze(true);

void SplashScreen.preventAutoHideAsync().catch(() => {});
// initSentry();
registerRootComponent(App);
