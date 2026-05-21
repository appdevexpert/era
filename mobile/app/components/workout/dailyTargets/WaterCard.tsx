import IconButton from "@/app/components/common/IconButton";
import { FONTS } from "@/app/constants/fonts";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import WaterDrop from "./WaterDrop";
import { CARD_MIN_HEIGHT, GOLD } from "./tokens";

interface WaterCardProps {
  consumedMl: number;
  /** Daily goal in ml — default 2000 (2L). */
  goalMl?: number;
  /** Number of glasses target — default 8. */
  totalGlasses?: number;
  /** ml per increment button tap — default 250. */
  incrementMl?: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
}

const IncButton = ({
  symbol,
  emphasized,
  onPress,
}: {
  symbol: "−" | "+";
  emphasized?: boolean;
  onPress?: () => void;
}) => (
  <IconButton onPress={onPress} size={32} tint={emphasized ? "emphasized" : "subtle"}>
    <Text style={styles.incSymbol}>{symbol}</Text>
  </IconButton>
);

const TOTAL_DROPS = 10;
const DROPS_PER_ROW = 5;

const WaterCard = ({
  consumedMl,
  goalMl = 2000,
  totalGlasses = 8,
  incrementMl = 250,
  onIncrement,
  onDecrement,
}: WaterCardProps) => {
  const { t } = useTranslation();
  const glasses = consumedMl / incrementMl;
  const fullDrops = Math.floor(glasses);
  const partial = glasses - fullDrops;
  const progressPercent = Math.min((glasses / totalGlasses) * 100, 100);
  const goalLiters = goalMl / 1000;

  return (
    <View style={styles.card}>
      {/* Top section */}
      <View style={styles.topRow}>
        <View style={styles.heroCol}>
          <Text style={styles.heroValue}>{t("nutrition.waterValue", { value: consumedMl })}</Text>
          <Text style={styles.heroSubtitle}>{t("nutrition.waterConsumption")}</Text>
        </View>
        <View style={styles.incChip}>
          <IncButton symbol="−" onPress={onDecrement} />
          <Text style={styles.incText}>{t("nutrition.waterIncrement", { value: incrementMl })}</Text>
          <IncButton symbol="+" emphasized onPress={onIncrement} />
        </View>
      </View>

      {/* Drops grid — 10 drops in a 5x2 layout */}
      <View style={styles.dropsGrid}>
        {Array.from({ length: TOTAL_DROPS / DROPS_PER_ROW }, (_, row) => (
          <View key={row} style={styles.dropRow}>
            {Array.from({ length: DROPS_PER_ROW }, (_, col) => {
              const i = row * DROPS_PER_ROW + col;
              const fill = i < fullDrops ? 1 : i === fullDrops ? partial : 0;
              return <WaterDrop key={col} filled={fill} size={36} />;
            })}
          </View>
        ))}
      </View>

      {/* Bottom progress row */}
      <View style={styles.footerRow}>
        <Text style={styles.glassesText}>
          {t("nutrition.glassesProgress", { current: glasses, total: totalGlasses })}
        </Text>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={["#FCF3C0", "#F7E06F", "#C9A84C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>
        <Text style={styles.goalText}>
          {t("nutrition.dailyGoalLiters")}{" "}
          <Text style={styles.goalValue}>
            {t("nutrition.dailyGoalLitersValue", { value: goalLiters })}
          </Text>
        </Text>
      </View>
    </View>
  );
};

export default WaterCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111111",
    borderWidth: 1.5,
    borderColor: "#1E1E1E",
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    overflow: "hidden",
    minHeight: CARD_MIN_HEIGHT + 15,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroCol: {
    flexShrink: 1,
    gap: 2,
  },
  heroValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 32,
    fontWeight: "600",
    color: "#FBEFAF",
  },
  heroSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: "#F0F0F0",
  },
  incChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  incSymbol: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: GOLD,
    lineHeight: 18,
  },
  incText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: "600",
    color: GOLD,
  },
  dropsGrid: {
    gap: 30,
    alignItems: "center",
  },
  dropRow: {
    flexDirection: "row",
    gap: 30,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  glassesText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: "600",
    color: GOLD,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(240, 240, 240, 0.1)",
    borderRadius: 100,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 100,
  },
  goalText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.5)",
  },
  goalValue: {
    color: "rgba(240, 240, 240, 0.75)",
  },
});
