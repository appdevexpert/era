import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenFadesProps {
  /** Extra px added to the safe-area-top inset for the top fade. Default 24. */
  topExtra?: number;
  /** Extra px added to the safe-area-bottom inset for the bottom fade. Default 100. */
  bottomExtra?: number;
  /** Hide the top fade — e.g. for screens that already have a solid header. */
  hideTop?: boolean;
  /** Hide the bottom fade. */
  hideBottom?: boolean;
}

/**
 * Top + bottom #0A0A0A fade gradients that dissolve scroll content into the
 * status-bar / home-indicator safe-area regions. Used across the home tabs
 * (Nutrition, Weights, Progress) — single source of truth.
 *
 * Mount this once at the bottom of the screen root (after the ScrollView)
 * with `pointerEvents="none"` so it never blocks taps on content behind.
 */
const ScreenFades = ({
  topExtra = 24,
  bottomExtra = 100,
  hideTop = false,
  hideBottom = false,
}: ScreenFadesProps) => {
  const insets = useSafeAreaInsets();
  return (
    <>
      {hideTop ? null : (
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(10,10,10,1)", "rgba(10,10,10,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.top, { height: insets.top + topExtra }]}
        />
      )}
      {hideBottom ? null : (
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(10,10,10,0)", "rgba(10,10,10,1)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.bottom, { height: insets.bottom + bottomExtra }]}
        />
      )}
    </>
  );
};

export default ScreenFades;

const styles = StyleSheet.create({
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
