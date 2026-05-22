import { NutrientBeans, NutrientCheese, NutrientWheat } from "@/assets/icons";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import KcalHero from "./KcalHero";
import MacroSlot from "./MacroSlot";
import SemicircleGauge from "./SemicircleGauge";
import { CARD_MIN_HEIGHT, SEMICIRCLE_GAUGE_SIZE } from "./tokens";

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
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.gaugeSection}>
        <SemicircleGauge value={kcalEaten} total={kcalTotal} />
        <View style={styles.centerHero}>
          <KcalHero eaten={kcalEaten} total={kcalTotal} />
        </View>
      </View>
      <View style={styles.macroRow}>
        <MacroSlot
          label={t("nutrition.proteinLabel")}
          Icon={NutrientBeans}
          value={protein.eaten}
          left={protein.total - protein.eaten}
          total={protein.total}
        />
        <MacroSlot
          label={t("nutrition.carbsLabel")}
          Icon={NutrientWheat}
          value={carbs.eaten}
          left={Math.max(carbs.total - carbs.eaten, 0)}
          total={carbs.total}
        />
        <MacroSlot
          label={t("nutrition.fatsLabel")}
          Icon={NutrientCheese}
          value={fats.eaten}
          left={fats.total - fats.eaten}
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
    paddingVertical: 20,
    paddingHorizontal: 16,
    overflow: "hidden",
    minHeight: CARD_MIN_HEIGHT,
    justifyContent: "space-between",
  },
  gaugeSection: {
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
