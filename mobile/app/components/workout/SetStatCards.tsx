import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

type SetStat = {
  weight: string;
  reps: number;
};

type SetStatCardsProps = {
  bestSet?: SetStat | null;
  lastSet?: SetStat | null;
};

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.card}>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const SetStatCards = ({ bestSet, lastSet }: SetStatCardsProps) => {
  const { t } = useTranslation();

  // Nothing to show — new user, first time on this exercise
  if (!bestSet && !lastSet) return null;

  const formatSet = (set: SetStat) =>
    t("workout.ui.repsFormat", { weight: set.weight, reps: set.reps });

  return (
    <View style={styles.row}>
      {lastSet ? (
        <StatCard
          value={formatSet(lastSet)}
          label={t("workout.ui.lastSet")}
        />
      ) : null}
      {bestSet ? (
        <StatCard
          value={formatSet(bestSet)}
          label={t("workout.ui.bestSet")}
        />
      ) : null}
    </View>
  );
};

export default SetStatCards;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  value: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 21.6,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    textAlign: "center",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
});
