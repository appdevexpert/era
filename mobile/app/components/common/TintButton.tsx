import GlassFill from "@/app/components/common/GlassFill";
import PressableScale from "@/app/components/common/PressableScale";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { LinearGradient } from "expo-linear-gradient";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

export type TintButtonVariant = "destructive" | "gold";

interface TintButtonProps {
  label: string;
  onPress: () => void;
  variant: TintButtonVariant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const TintButton = ({ label, onPress, variant, style, disabled = false }: TintButtonProps) => (
  <PressableScale
    style={[styles.base, style, disabled && styles.disabled]}
    onPress={onPress}
    disabled={disabled}
  >
    {variant === "gold" ? (
      <LinearGradient
        pointerEvents="none"
        colors={["#FCF3C0", "#F7E06F", "#C9A84C"]}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0, y: 0.5 }}
        style={styles.fill}
      />
    ) : (
      <View pointerEvents="none" style={[styles.fill, styles.destructiveTint]} />
    )}
    <GlassFill style={styles.fill} />
    <Text style={styles.label}>{label}</Text>
  </PressableScale>
);

export default TintButton;

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
