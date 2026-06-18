import GoldGradientText from "@/app/components/common/GoldGradientText";
import PrimaryButton from "@/app/components/common/PrimaryButton";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { getUserBestWeightsBySlug } from "@/app/services/assignmentService";
import type { RootState } from "@/app/stores/store";
import {
  BRO_SPLIT_WEIGHT_RATIOS,
  calculateHeavierStartingWeight,
} from "@/app/utils/cycleStartingWeights";
import { TwelveWeekDiamond } from "@/assets/images";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

interface ExerciseRow {
  /** Localized display name */
  name: string;
  /** Cycle 1 best weight in kg, or null when no data */
  oldKg: number | null;
  /** Cycle 2 starting weight in kg */
  newKg: number;
}

// 5 lifts shown on the celebration table — same shape as Rami's example.
// Display order is fixed; mapping target depends on whether the new cycle
// is Heavier (same lift) or Bro Split (cycle 1 lift → bro-split lift).
const HEAVIER_LIFTS: { slug: string; labelKey: string }[] = [
  { slug: "bench-press",     labelKey: "cycle2Begins.lifts.benchPress" },
  { slug: "squat",           labelKey: "cycle2Begins.lifts.squat" },
  { slug: "overhead_press",  labelKey: "cycle2Begins.lifts.militaryPress" },
  { slug: "incline_dumbbell_press", labelKey: "cycle2Begins.lifts.inclinePress" },
  { slug: "barbell_row",     labelKey: "cycle2Begins.lifts.barbellRow" },
];

const BRO_SPLIT_LIFTS: { slug: string; labelKey: string }[] = [
  { slug: "incline_barbell_press",  labelKey: "cycle2Begins.lifts.inclineBarbellPress" },
  { slug: "t_bar_row",              labelKey: "cycle2Begins.lifts.tBarRow" },
  { slug: "front_squat",            labelKey: "cycle2Begins.lifts.frontSquat" },
  { slug: "behind_neck_press",      labelKey: "cycle2Begins.lifts.behindNeckPress" },
  { slug: "close_grip_bench_press", labelKey: "cycle2Begins.lifts.closeGripBenchPress" },
];

const formatKg = (kg: number | null): string => (kg == null ? "—" : `${kg}kg`);

const ArrowUp = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 19V5M6 11l6-6 6 6"
      stroke={COLORS.primary.dark}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const Cycle2BeginsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { t } = useTranslation();
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const assignment = useSelector((s: RootState) => s.workout.assignment);
  const [cycle1Best, setCycle1Best] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getUserBestWeightsBySlug(userId)
      .then((map) => {
        if (!cancelled) setCycle1Best(map);
      })
      .catch((err) => console.warn("[Cycle2Begins] best weights fetch failed", err));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isBroSplit = assignment?.program_id === "88888888-8888-8888-8888-888888888888";

  const rows: ExerciseRow[] = useMemo(() => {
    if (isBroSplit) {
      return BRO_SPLIT_LIFTS.map(({ slug, labelKey }) => {
        const ratio = BRO_SPLIT_WEIGHT_RATIOS[slug];
        const oldKg = ratio ? (cycle1Best[ratio.sourceExerciseSlug] ?? null) : null;
        const newKg = ratio && oldKg != null ? Math.round((oldKg * ratio.ratio) / 2.5) * 2.5 : 0;
        return { name: t(labelKey), oldKg, newKg };
      }).filter((r) => r.oldKg != null);
    }
    return HEAVIER_LIFTS.map(({ slug, labelKey }) => {
      const oldKg = cycle1Best[slug] ?? null;
      const newKg =
        calculateHeavierStartingWeight({
          week12TopSetKg: oldKg,
          week12Rating: "correct",
          week11WeightKg: null,
          attemptedWeightKg: null,
        }) ?? 0;
      return { name: t(labelKey), oldKg, newKg };
    }).filter((r) => r.oldKg != null);
  }, [cycle1Best, isBroSplit, t]);

  const handleStart = () => {
    navigation.popToTop();
  };

  return (
    <View style={styles.root}>
      <View style={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.hero}>
          <Image source={TwelveWeekDiamond} style={styles.diamond} resizeMode="contain" />
          <GoldGradientText text={t("cycle2Begins.title")} fontSize={32} width={300} viewBoxWidth={300} />
          <Text style={styles.subtitle}>{t("cycle2Begins.subtitle")}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colName, styles.headerCell]}>{t("cycle2Begins.colExercises")}</Text>
            <Text style={[styles.colOld, styles.headerCell]}>{t("cycle2Begins.colOld")}</Text>
            <Text style={[styles.colNew, styles.headerCell, styles.headerCellNew]}>{t("cycle2Begins.colNew")}</Text>
          </View>

          {rows.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.colName, styles.rowName]}>{t("cycle2Begins.empty", { defaultValue: "Not enough cycle 1 data yet" })}</Text>
            </View>
          ) : (
            rows.map((row) => (
              <View key={row.name} style={styles.tableRow}>
                <Text style={[styles.colName, styles.rowName]}>{row.name}</Text>
                <Text style={[styles.colOld, styles.rowOld]}>{formatKg(row.oldKg)}</Text>
                <View style={[styles.colNew, styles.rowNewWrap]}>
                  <Text style={styles.rowNew}>{formatKg(row.newKg)}</Text>
                  <ArrowUp />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footnote}>{t("cycle2Begins.footnote")}</Text>
          <PrimaryButton label={t("cycle2Begins.cta")} onPress={handleStart} />
        </View>
      </View>
    </View>
  );
};

export default Cycle2BeginsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  hero: {
    alignItems: "center",
    gap: 18,
    marginTop: 24,
  },
  diamond: {
    width: 83,
    height: 83,
    opacity: 0.9,
  },
  subtitle: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
    lineHeight: 22.4,
    maxWidth: 332,
  },
  table: {
    marginTop: 32,
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 16,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    height: 36,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    height: 48,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.charcoal,
  },
  colName: {
    flex: 1.5,
    paddingHorizontal: 16,
  },
  colOld: {
    width: 80,
    paddingHorizontal: 14,
  },
  colNew: {
    flex: 1,
    paddingLeft: 14,
    paddingRight: 16,
  },
  headerCell: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(240,240,240,0.6)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  headerCellNew: {
    color: COLORS.primary.dark,
  },
  rowName: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: "400",
    color: COLORS.neutral.white,
  },
  rowOld: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(240,240,240,0.6)",
    letterSpacing: 0.64,
    textDecorationLine: "line-through",
  },
  rowNewWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowNew: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: "400",
    color: COLORS.primary.dark,
    letterSpacing: 0.64,
  },
  footer: {
    marginTop: "auto",
    gap: 24,
  },
  footnote: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
    lineHeight: 19.6,
    maxWidth: 332,
    alignSelf: "center",
  },
});
