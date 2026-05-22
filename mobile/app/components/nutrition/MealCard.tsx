import IconButton from "@/app/components/common/IconButton";
import MealMetaChip from "@/app/components/nutrition/MealMetaChip";
import { type MealRow } from "@/app/components/nutrition/types";
import { FONTS } from "@/app/constants/fonts";
import {
  MealBreakfast,
  MealChipBeans,
  MealChipCheese,
  MealChipFire,
  MealChipWheat,
  TablerPlus,
} from "@/assets/icons";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

interface MealCardProps {
  meal: MealRow;
  onAdd?: (meal: MealRow) => void;
}

const MealCard = ({ meal, onAdd }: MealCardProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <MealBreakfast width={28} height={28} />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              {t("nutrition.suggestedTag", { meal: t(`nutrition.${meal.category}`) })}
            </Text>
            <Text style={styles.name}>{meal.name}</Text>
          </View>
          <IconButton size={40} tint="emphasized" onPress={onAdd ? () => onAdd(meal) : undefined}>
            <TablerPlus width={20} height={20} color="#F0F0F0" />
          </IconButton>
        </View>
        <View style={styles.metaRow}>
          <MealMetaChip Icon={MealChipFire} value={`${meal.kcal} kcal`} suffix="" />
          <MealMetaChip Icon={MealChipBeans} value={meal.protein} />
          <MealMetaChip Icon={MealChipWheat} value={meal.carbs} />
          <MealMetaChip Icon={MealChipCheese} value={meal.fats} />
        </View>
      </View>
    </View>
  );
};

export default MealCard;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 18,
    alignItems: "flex-start",
  },
  iconBox: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#111111",
    borderWidth: 1.5,
    borderColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 12,
    alignItems: "flex-start",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerText: {
    flex: 1,
    gap: 6,
    alignItems: "flex-start",
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "#868592",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
});
