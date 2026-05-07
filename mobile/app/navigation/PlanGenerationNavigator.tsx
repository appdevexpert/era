import PlanGeneration from "@/app/screen/planGeneration/PlanGeneration";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PlanGenerationStackParamList } from "./types";

const Stack = createNativeStackNavigator<PlanGenerationStackParamList>();

const PlanGenerationNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
    <Stack.Screen name="PlanGeneration" component={PlanGeneration} />
  </Stack.Navigator>
);

export default PlanGenerationNavigator;
