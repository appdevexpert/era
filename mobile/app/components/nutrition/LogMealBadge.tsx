import { FONTS } from "@/app/constants/fonts";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";

interface LogMealBadgeProps {
  onPress: () => void;
}

const LogMealBadge = ({ onPress }: LogMealBadgeProps) => {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
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
  text: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 16.8,
    fontWeight: "500",
    color: "#F0F0F0",
  },
});
