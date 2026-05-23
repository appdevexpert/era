import IconButton from "@/app/components/common/IconButton";
import MealMetaChip from "@/app/components/nutrition/MealMetaChip";
import { type MealRow } from "@/app/components/nutrition/types";
import { FONTS } from "@/app/constants/fonts";
import {
  MealChipBeans,
  MealChipCheese,
  MealChipFire,
  MealChipWheat,
  TablerMinus,
  TablerPlus,
} from "@/assets/icons";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

// Light gold from the primary gradient — the +/− glyph reads well on the
// gold-tinted glass without looking pure white.
const BUTTON_ICON_COLOR = "#F7E06F";

// Default icon tints driven by the `added` flag (parent can override via
// MealRow.iconColor when they want a different color per row).
const ICON_COLOR_ADDED = "#C9A84C"; // primary gold
const ICON_COLOR_INACTIVE = "#6F6C7D"; // dim gray — matches Figma "not added"
const CHIP_COLOR_ADDED = "#C9A84C";
const CHIP_COLOR_INACTIVE = "#868592";

interface MealCardProps {
  meal: MealRow;
  /** Fired when the user taps the +/− button. */
  onToggle?: (meal: MealRow) => void;
  /** Renders the +/− button as faded and non-interactive. Used when the
   *  Nutrition tab is viewing a non-today date (preview-only). */
  disabled?: boolean;
}

const MealCard = ({ meal, onToggle, disabled }: MealCardProps) => {
  const { t } = useTranslation();
  const added = !!meal.added;
  const source: MealSource = meal.source ?? "custom";
  const Icon = meal.Icon;
  const iconColor =
    meal.iconColor ?? (added ? ICON_COLOR_ADDED : ICON_COLOR_INACTIVE);
  const chipColor = added ? CHIP_COLOR_ADDED : CHIP_COLOR_INACTIVE;

  const eyebrow = !added
    ? t("nutrition.notAdded")
    : source === "plan"
      ? t("nutrition.asPerPlanTag", {
          meal: t(`nutrition.${meal.category}`),
        })
      : t("nutrition.customAddedTag", {
          meal: t(`nutrition.${meal.category}`),
        });

  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, added && styles.iconBoxAdded]}>
        <Icon width={28} height={28} color={iconColor} />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, added && styles.eyebrowAdded]}>
              {eyebrow}
            </Text>
            <Text style={styles.name}>{meal.name}</Text>
          </View>
          <IconButton
            size={40}
            tint={added ? "subtle" : "emphasized"}
            onPress={!disabled && onToggle ? () => onToggle(meal) : undefined}
            style={disabled ? { opacity: 0.4 } : undefined}
          >
            {added ? (
              <TablerMinus width={20} height={20} color={BUTTON_ICON_COLOR} />
            ) : (
              <TablerPlus width={20} height={20} color={BUTTON_ICON_COLOR} />
            )}
          </IconButton>
        </View>
        <View style={styles.metaRow}>
          <MealMetaChip
            Icon={MealChipFire}
            value={`${meal.kcal} kcal`}
            suffix=""
            color={chipColor}
          />
          <MealMetaChip
            Icon={MealChipBeans}
            value={meal.protein}
            color={chipColor}
          />
          <MealMetaChip
            Icon={MealChipWheat}
            value={meal.carbs}
            color={chipColor}
          />
          <MealMetaChip
            Icon={MealChipCheese}
            value={meal.fats}
            color={chipColor}
          />
        </View>
      </View>
    </View>
  );
};

export default MealCard;

// Local import alias to keep the type ref out of the runtime require graph.
type MealSource = "plan" | "custom";

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
  // Gold-tinted icon box for "added" rows (Figma node 4769:70279).
  iconBoxAdded: {
    backgroundColor: "#1D1A11",
    borderColor: "#3A321B",
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
    fontSize: 10,
    lineHeight: 12,
    color: "#868592",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  eyebrowAdded: {
    color: "#977F3B",
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
