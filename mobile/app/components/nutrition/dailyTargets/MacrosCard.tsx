import { FONTS } from "@/app/constants/fonts";
import { NutrientBeans, NutrientCheese, NutrientWheat } from "@/assets/icons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { groupThousands } from "./format";
import KcalHero from "./KcalHero";
import MacroSlot from "./MacroSlot";
import SemicircleGauge from "./SemicircleGauge";
import {
  CARD_MIN_HEIGHT,
  GOLD,
  isOverTarget,
  SEMICIRCLE_GAUGE_SIZE,
} from "./tokens";

interface MacroData {
  eaten: number;
  total: number;
}

interface MacrosCardProps {
  kcalEaten: number;
  kcalTotal: number;
  protein: MacroData;
  carbs: MacroData;
  fats: MacroData;
}

const MacrosCard = ({ kcalEaten, kcalTotal, protein, carbs, fats }: MacrosCardProps) => {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.card}>
      {/* Figma 7535:4316 — gray "Target" + gold target value, top-left. Stays
          gold in every state; only the gauge, the kcal number and the macros
          that passed their own target flip to salmon. */}
      <View style={styles.targetRow}>
        <Text style={styles.targetLabel}>{t("nutrition.targetLabel")}</Text>
        <Text style={styles.targetValue}>
          {t("nutrition.kcalValue", { value: groupThousands(kcalTotal, i18n.language) })}
        </Text>
      </View>
      <View style={styles.gaugeSection}>
        <SemicircleGauge
          value={kcalEaten}
          total={kcalTotal}
          over={isOverTarget(kcalEaten, kcalTotal)}
        />
        <View style={styles.centerHero}>
          <KcalHero eaten={kcalEaten} total={kcalTotal} />
        </View>
      </View>
      {/* Each slot decides its own colour — in the Figma over-target mock
          fats stays gold because fats itself had not passed its target. */}
      <View style={styles.macroRow}>
        <MacroSlot
          label={t("nutrition.proteinLabel")}
          Icon={NutrientBeans}
          value={protein.eaten}
          total={protein.total}
        />
        <MacroSlot
          label={t("nutrition.carbsLabel")}
          Icon={NutrientWheat}
          value={carbs.eaten}
          total={carbs.total}
        />
        <MacroSlot
          label={t("nutrition.fatsLabel")}
          Icon={NutrientCheese}
          value={fats.eaten}
          total={fats.total}
        />
      </View>
    </View>
  );
};

export default MacrosCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111111",
    borderWidth: 1.5,
    borderColor: "#1E1E1E",
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    overflow: "hidden",
    minHeight: CARD_MIN_HEIGHT,
    justifyContent: "space-between",
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  targetLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.5)",
  },
  targetValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: "600",
    color: GOLD,
  },
  gaugeSection: {
    marginTop: 4,
    alignItems: "center",
    height: SEMICIRCLE_GAUGE_SIZE / 2 + 60,
    justifyContent: "flex-start",
  },
  centerHero: {
    position: "absolute",
    top: SEMICIRCLE_GAUGE_SIZE / 2 - 60,
    alignItems: "center",
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
});
