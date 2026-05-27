import ScreenFades from "@/app/components/common/ScreenFades";
import ExerciseSummaryCard from "@/app/components/workout/ExerciseSummaryCard";
import { FONTS } from "@/app/constants/fonts";
import { type HomeStackParamList } from "@/app/navigation/types";
import { loadPRBootstrap } from "@/app/stores/slice/prSlice";
import {
  selectLatestPRs,
  selectPRStatus,
} from "@/app/stores/selectors/prSelectors";
import { useAppDispatch } from "@/app/stores/store";
import type { RootState } from "@/app/stores/store";
import { getLocalizedText } from "@/app/utils/localization";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  compound: "progress.categoryCompound",
  isolation: "progress.categoryIsolation",
  core: "progress.categoryCore",
  cardio: "progress.categoryCardio",
  warmup: "progress.categoryWarmup",
  cooldown: "progress.categoryCooldown",
};

interface PrRow {
  id: string;
  exerciseId: string;
  category: string;
  name: string;
  meta: string;
  weightKg: number;
  delta?: { kg: number; positive: boolean };
}

const PrHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();

  const userId = useSelector((s: RootState) => s.auth.user?.id ?? null);
  const latestPRs = useSelector(selectLatestPRs);
  const prStatus = useSelector(selectPRStatus);

  // Safety-net — if user lands here without the slice being hydrated yet
  // (deep link, prior crash) fetch on mount.
  useEffect(() => {
    if (userId && prStatus === "idle") {
      dispatch(loadPRBootstrap(userId));
    }
  }, [dispatch, userId, prStatus]);

  const rows: PrRow[] = useMemo(
    () =>
      latestPRs.map((pr) => {
        const localizedName = pr.exerciseNameTranslations
          ? getLocalizedText(pr.exerciseNameTranslations, i18n.language, pr.exerciseName)
          : pr.exerciseName;
        const categoryKey = CATEGORY_LABEL_KEYS[pr.exerciseCategory];
        const category = categoryKey ? t(categoryKey) : pr.exerciseCategory;
        const delta =
          pr.previousWeightKg != null && pr.previousWeightKg > 0
            ? {
                kg: Math.max(0, pr.weightKg - pr.previousWeightKg),
                positive: true,
              }
            : undefined;
        return {
          id: pr.id,
          exerciseId: pr.exerciseId,
          category,
          name: localizedName,
          meta: t("progress.prHistory.meta", { sets: 1, reps: pr.reps ?? 0 }),
          weightKg: pr.weightKg,
          delta,
        };
      }),
    [latestPRs, i18n.language, t],
  );

  const openExercisePrHistory = (row: PrRow) =>
    navigation.navigate("ExercisePrHistory", {
      exerciseId: row.exerciseId,
      title: row.name,
      subtitle: row.category,
    });

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <Text style={styles.sectionTitle}>{t("progress.prHistory.exercises")}</Text>

        {rows.length > 0 ? (
          <View style={styles.list}>
            {rows.map((row) => (
              <ExerciseSummaryCard
                key={row.id}
                category={row.category}
                name={row.name}
                meta={row.meta}
                weightKg={row.weightKg}
                delta={row.delta}
                onPress={() => openExercisePrHistory(row)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t("progress.prHistory.emptyTitle")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("progress.prHistory.emptySubtitle")}
            </Text>
          </View>
        )}
      </ScrollView>

      <ScreenFades hideTop />
    </View>
  );
};

export default PrHistoryScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  list: { gap: 12 },
  empty: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 24,
    gap: 8,
    alignItems: "center",
    marginTop: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: "#F0F0F0",
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "rgba(240,240,240,0.5)",
    textAlign: "center",
  },
});
