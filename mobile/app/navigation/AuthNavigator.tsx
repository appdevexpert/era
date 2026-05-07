import Login from "@/app/screen/auth/Login";
import ForgotPassword from "@/app/screen/auth/ForgotPassword";
import CreateAccount from "@/app/screen/auth/CreateAccount";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="CreateAccount" component={CreateAccount} />
    <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
  </Stack.Navigator>
);

export default AuthNavigator;
