import { FONTS } from "@/app/constants/fonts";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";

interface LogMealBadgeProps {
  onPress: () => void;
  /** Renders the badge in a faded, non-interactive state. Used when the
   *  Nutrition tab is viewing a non-today date (preview-only). */
  disabled?: boolean;
}

const LogMealBadge = ({ onPress, disabled }: LogMealBadgeProps) => {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.badge,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(201,168,76,0.25)", "rgba(241,203,48,0.25)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.text}>{t("nutrition.logMeal")}</Text>
    </Pressable>
  );
};

export default LogMealBadge;

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 16.8,
    fontWeight: "500",
    color: "#F0F0F0",
  },
});
