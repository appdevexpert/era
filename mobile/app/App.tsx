import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useState } from "react";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import IntroVideoSplash from "./components/common/IntroVideoSplash";
import { toastConfig } from "./components/common/toastConfig";
import Navigation from "./navigation/Navigation";
import { configureRevenueCat } from "./services/revenueCatService";
import { persistor, store } from "./stores/store";
import { freezeSessionOnColdStart } from "./stores/slice/sessionSlice";
import "./locales/i18n";

SplashScreen.preventAutoHideAsync();

// RC SDK init runs at module scope so it's ready before any screen mounts.
// configureRevenueCat is idempotent; the service owns its own listener.
configureRevenueCat();

const App = () => {
  const [fontsLoaded] = useFonts({
    "Italiana-Regular": require("../assets/fonts/Italiana-Regular.ttf"),
    "PlayfairDisplay": require("../assets/fonts/PlayfairDisplay.ttf"),
  });
  const [introDone, setIntroDone] = useState(false);

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const handleIntroFinish = useCallback(() => {
    setIntroDone(true);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <Provider store={store}>
      <PersistGate
        loading={null}
        persistor={persistor}
        onBeforeLift={() => {
          store.dispatch(freezeSessionOnColdStart());
        }}
      >
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
            <View style={{ flex: 1, backgroundColor: "#000000" }} onLayout={onLayoutRootView}>
              <BottomSheetModalProvider>
                <StatusBar barStyle="light-content" translucent={true} />
                <Navigation />
                <Toast config={toastConfig} />
                {!introDone && <IntroVideoSplash onFinish={handleIntroFinish} />}
              </BottomSheetModalProvider>
            </View>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
