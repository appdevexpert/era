import Onboarding from "@/app/screen/onboarding/Onboarding";
import PaywallScreen from "@/app/screen/home/PaywallScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "./types";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="Onboarding" component={Onboarding} />
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

export default OnboardingNavigator;
