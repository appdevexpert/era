import GetStarted from "@/app/screen/onboarding/GetStarted";
import Login from "@/app/screen/auth/Login";
import ForgotPassword from "@/app/screen/auth/ForgotPassword";
import CreateAccount from "@/app/screen/auth/CreateAccount";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/stores/store";
import { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  // Slide-to-start gate. Persisted in Redux (auth slice) so it survives logout
  // — only account delete (RESET_ALL) brings GetStarted back. Fresh installs
  // start with this false → GetStarted is the initial route.
  const hasSeenGetStarted = useSelector(
    (state: RootState) => state.auth.hasSeenGetStarted,
  );
  return (
    <Stack.Navigator
      initialRouteName={hasSeenGetStarted ? "Login" : "GetStarted"}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}
    >
      <Stack.Screen name="GetStarted" component={GetStarted} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="CreateAccount" component={CreateAccount} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
