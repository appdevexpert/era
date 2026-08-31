import { GlassView } from "expo-glass-effect";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type GlassEffect = "regular" | "clear";
type GlassScheme = "dark" | "light";

interface GlassFillProps {
  effect?: GlassEffect;
  scheme?: GlassScheme;
  style?: StyleProp<ViewStyle>;
}

// Android has no native glass primitive (expo-glass-effect is iOS 26+ only),
// so we mimic the tint with a semi-transparent surface. Alphas are tuned per
// effect/scheme so buttons, sheets, pills and tag chips all read correctly on a
// dark canvas without picking up a hard rectangle.
const FALLBACK_STYLES: Record<`${GlassEffect}-${GlassScheme}`, ViewStyle> = {
  "regular-dark": { backgroundColor: "rgba(255, 255, 255, 0.10)" },
  "regular-light": { backgroundColor: "rgba(255, 255, 255, 0.16)" },
  "clear-dark": { backgroundColor: "rgba(255, 255, 255, 0.05)" },
  "clear-light": { backgroundColor: "rgba(255, 255, 255, 0.08)" },
};

export const getGlassFallbackStyle = (
  effect: GlassEffect = "regular",
  scheme: GlassScheme = "dark",
): ViewStyle => FALLBACK_STYLES[`${effect}-${scheme}`];

const GlassFill = ({ effect = "regular", scheme = "dark", style }: GlassFillProps) => {
  if (Platform.OS !== "ios") {
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, getGlassFallbackStyle(effect, scheme), style]}
      />
    );
  }
  return (
    <GlassView
      pointerEvents="none"
      glassEffectStyle={effect}
      colorScheme={scheme}
      style={[StyleSheet.absoluteFillObject, style]}
    />
  );
};

export default GlassFill;
