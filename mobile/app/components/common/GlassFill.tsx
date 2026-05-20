import { GlassView } from "expo-glass-effect";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";

interface GlassFillProps {
  effect?: "regular" | "clear";
  scheme?: "dark" | "light";
  style?: StyleProp<ViewStyle>;
}

const GlassFill = ({ effect = "regular", scheme = "dark", style }: GlassFillProps) => (
  <GlassView
    pointerEvents="none"
    glassEffectStyle={effect}
    colorScheme={scheme}
    style={[StyleSheet.absoluteFillObject, style]}
  />
);

export default GlassFill;
