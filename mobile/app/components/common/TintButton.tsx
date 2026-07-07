import GlassFill from "@/app/components/common/GlassFill";
import PressableScale from "@/app/components/common/PressableScale";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

export type TintButtonVariant = "destructive" | "gold";

// Hoisted so the gradient's `colors`/`start`/`end` keep a stable reference across
// renders — expo-linear-gradient reference-compares these and re-draws the native
// gradient on any change. Inline literals gave it a fresh array/object every
// parent re-render (e.g. each keystroke in a sheet), read as a color flicker.
const GOLD_COLORS = ["#FCF3C0", "#F7E06F", "#C9A84C"] as const;
const GOLD_START = { x: 1, y: 0.5 };
const GOLD_END = { x: 0, y: 0.5 };

interface TintButtonProps {
  label: string;
  onPress: () => void;
  variant: TintButtonVariant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
}

const TintButton = ({
  label,
  onPress,
  variant,
  style,
  disabled = false,
  loading = false,
}: TintButtonProps) => {
  const isInactive = disabled || loading;
  return (
    <PressableScale
      style={[styles.base, style, isInactive && styles.disabled]}
      onPress={onPress}
      disabled={isInactive}
    >
      {variant === "gold" ? (
        <LinearGradient
          pointerEvents="none"
          colors={GOLD_COLORS}
          start={GOLD_START}
          end={GOLD_END}
          style={styles.fill}
        />
      ) : (
        <View pointerEvents="none" style={[styles.fill, styles.destructiveTint]} />
      )}
      <GlassFill style={styles.fill} />
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.neutral.white} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </PressableScale>
  );
};

export default memo(TintButton);

const styles = StyleSheet.create({
  base: {
    borderRadius: 138.122,
    paddingVertical: 16,
    paddingHorizontal: 20.626,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  disabled: {
    opacity: 0.5,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 138.122,
  },
  destructiveTint: {
    backgroundColor: "rgba(230,119,119,0.36)",
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.neutral.white,
    textAlign: "center",
    letterSpacing: 0.36,
  },
});
