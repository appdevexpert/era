import GetStarted from "@/app/screen/onboarding/GetStarted";
import Onboarding from "@/app/screen/onboarding/Onboarding";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "./types";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="GetStarted" component={GetStarted} />
    <Stack.Screen name="Onboarding" component={Onboarding} />
  </Stack.Navigator>
);

export default OnboardingNavigator;
