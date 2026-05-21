import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import GlassFill from "./GlassFill";

export type IconButtonTint = "none" | "subtle" | "regular" | "emphasized";

interface IconButtonProps {
  /** Icon node — typically an SVG or Text glyph. Centered inside the button. */
  children: ReactNode;
  onPress?: () => void;
  /** Square size in px (default 32). */
  size?: number;
  /** Override the border-radius (default `size / 2` — perfectly circular). */
  borderRadius?: number;
  /** Glass effect intensity. `"clear"` is the lighter variant used for chips. */
  glassEffect?: "regular" | "clear";
  /** Gold gradient overlay strength. Use `"none"` for pure glass. */
  tint?: IconButtonTint;
  disabled?: boolean;
  /** Extra style merged onto the outer Pressable (for spacing tweaks). */
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
}

const TINT_ALPHA: Record<Exclude<IconButtonTint, "none">, number> = {
  subtle: 0.12,
  regular: 0.18,
  emphasized: 0.32,
};

/**
 * Reusable circular pressable with the ERA glass-plus-gold-tint look.
 * Use it for chevrons, increment buttons, and similar small action icons.
 */
const IconButton = ({
  children,
  onPress,
  size = 32,
  borderRadius,
  glassEffect = "clear",
  tint = "regular",
  disabled,
  style,
  hitSlop,
}: IconButtonProps) => {
  const radius = borderRadius ?? size / 2;
  const tintAlpha = tint === "none" ? null : TINT_ALPHA[tint];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: radius, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <GlassFill effect={glassEffect} scheme="dark" style={{ borderRadius: radius }} />
      {tintAlpha !== null ? (
        <LinearGradient
          pointerEvents="none"
          colors={[`rgba(201,168,76,${tintAlpha})`, `rgba(241,203,48,${tintAlpha})`]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </Pressable>
  );
};

export default IconButton;

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
