import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { horizontalScale } from "@/app/utils/responsive";
import { StatCoin, StatFire, StatWorkoutPlan } from "@/assets/icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

interface StatsChipsRowProps {
  points?: number;
  streakDays?: number;
  onPointsPress?: () => void;
  onStreakPress?: () => void;
}

const StatsChipsRow = ({ points = 340, streakDays = 5, onPointsPress, onStreakPress }: StatsChipsRowProps) => {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      {/* Points chip */}
      <Pressable style={styles.chip} onPress={onPointsPress}>
        <LinearGradient
          colors={["rgba(201, 168, 76, 0.25)", "rgba(201, 168, 76, 0.25)"]}
          style={[StyleSheet.absoluteFill, { borderRadius: 90 }]}
        />
        <View style={styles.iconWrap}>
          <StatCoin width={24} height={24} />
        </View>
        <Text style={styles.chipLabel}>{t("workout.ui.points", { count: points })}</Text>
      </Pressable>

      {/* Streak chip */}
      <Pressable onPress={onStreakPress}>
        <LinearGradient
          colors={["rgba(221, 62, 68, 0.08)", "rgba(247, 224, 111, 0.08)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.chip}
        >
          <View style={[styles.iconWrap, styles.fireIconBg]}>
            <StatFire width={32} height={32} />
          </View>
          <Text style={styles.chipLabel}>{t("workout.ui.streak", { count: streakDays })}</Text>
        </LinearGradient>
      </Pressable>

      {/* Workout Plan chip */}
      <LinearGradient
        colors={["rgba(4, 95, 16, 0.3)", "rgba(225, 182, 0, 0.3)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.chip}
      >
        <StatWorkoutPlan width={32} height={32} />
        <Text style={styles.chipLabel}>{t("workout.ui.workoutPlan")}</Text>
      </LinearGradient>
    </ScrollView>
  );
};

export default StatsChipsRow;

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -horizontalScale(20),
  },
  content: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: horizontalScale(16),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 52,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 90,
    overflow: "hidden",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  fireIconBg: {
    backgroundColor: "rgba(224, 85, 85, 0.1)",
  },
  chipLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    color: COLORS.neutral.white,
    lineHeight: 16.8,
  },
});
