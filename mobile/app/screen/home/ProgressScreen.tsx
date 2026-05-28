import AddPhotoBottomSheet, {
  type AddPhotoBottomSheetRef,
} from "@/app/components/common/AddPhotoBottomSheet";
import PhotoPreviewBottomSheet, {
  type PhotoPreviewBottomSheetRef,
} from "@/app/components/common/PhotoPreviewBottomSheet";
import ScreenFades from "@/app/components/common/ScreenFades";
import ScreenHeader from "@/app/components/common/ScreenHeader";
import HistoryCard, { type HistoryDay } from "@/app/components/progress/HistoryCard";
import LeaderboardCard from "@/app/components/progress/LeaderboardCard";
import LogHeightBottomSheet, {
  type LogHeightBottomSheetRef,
} from "@/app/components/progress/LogHeightBottomSheet";
import LogWeightBottomSheet, {
  type LogWeightBottomSheetRef,
} from "@/app/components/progress/LogWeightBottomSheet";
import PhotoStrip from "@/app/components/progress/PhotoStrip";
import PrCarousel from "@/app/components/progress/PrCarousel";
import { type PrEntry } from "@/app/components/progress/PrCard";
import ProgressStatsCard from "@/app/components/progress/ProgressStatsCard";
import { FONTS } from "@/app/constants/fonts";
import SectionHeader from "@/app/components/progress/SectionHeader";
import SuccessBanner from "@/app/components/progress/SuccessBanner";
import WeightStatsCard from "@/app/components/progress/WeightStatsCard";
import { type PlanPhase } from "@/app/components/workout/PlanProgressBar";
import { type HomeStackParamList } from "@/app/navigation/types";
import {
  loadProgressPhotos,
  uploadProgressPhotoThunk,
} from "@/app/stores/slice/photoSlice";
import { loadPRBootstrap } from "@/app/stores/slice/prSlice";
import { loadRewardBootstrap } from "@/app/stores/slice/rewardSlice";
import {
  loadWeightBootstrap,
  logWeightThunk,
  updateHeightThunk,
} from "@/app/stores/slice/weightSlice";
import {
  selectLatestPRs,
  selectPRStatus,
  selectWeeklyPRCount,
} from "@/app/stores/selectors/prSelectors";
import {
  selectCurrentStreak,
  selectLongestStreak,
  selectRewardStatus,
  selectTotalPoints,
  selectWeekByDate,
} from "@/app/stores/selectors/rewardSelectors";
import {
  selectChartYRange,
  selectCurrentWeightKg,
  selectGoalsWeightKg,
  selectHeaviestKg,
  selectHeightLabel,
  selectLightestKg,
  selectBmi,
  selectWeeklyChartPoints,
  selectWeightStatus,
} from "@/app/stores/selectors/weightSelectors";
import {
  buildPlanPhases,
  selectCurrentWeekNumber,
} from "@/app/stores/selectors/workoutSelectors";
import { useAppDispatch } from "@/app/stores/store";
import { getLocalizedText } from "@/app/utils/localization";
import { ProgressFire, ProgressFlag, ProgressMedal } from "@/assets/icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootState } from "@/app/stores/store";

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  compound: "progress.categoryCompound",
  isolation: "progress.categoryIsolation",
  core: "progress.categoryCore",
  cardio: "progress.categoryCardio",
  warmup: "progress.categoryWarmup",
  cooldown: "progress.categoryCooldown",
};

const LB_TO_KG = 0.45359237;

const toLocalIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Builds the Sun-Sat strip for the History card. State priority:
 *   - future date → upcoming
 *   - reward day status "completed" → completed
 *   - reward day status "missed" → missed
 *   - today → active
 *   - else (rest_day or no record) → upcoming
 */
const buildWeekDays = (
  weekByDate: Record<string, "completed" | "rest_day" | "missed">,
  language: string,
): HistoryDay[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toLocalIsoDate(today);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const iso = toLocalIsoDate(d);
    const label = d
      .toLocaleDateString(language, { weekday: "short" })
      .replace(".", "")
      .toUpperCase();
    const dateNum = String(d.getDate()).padStart(2, "0");
    const status = weekByDate[iso];

    let state: HistoryDay["state"];
    if (d.getTime() > today.getTime()) state = "upcoming";
    else if (status === "completed") state = "completed";
    else if (status === "missed") state = "missed";
    else if (iso === todayIso) state = "active";
    else state = "upcoming";

    return { label, date: dateNum, state };
  });
};

const formatPhotoDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" });

const ProgressScreen = () => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();
  const userId = useSelector((s: RootState) => s.auth.user?.id ?? null);
  const addPhotoSheetRef = useRef<AddPhotoBottomSheetRef>(null);
  const photoPreviewSheetRef = useRef<PhotoPreviewBottomSheetRef>(null);
  const logWeightSheetRef = useRef<LogWeightBottomSheetRef>(null);
  const logHeightSheetRef = useRef<LogHeightBottomSheetRef>(null);

  const weightStatus = useSelector(selectWeightStatus);
  const currentWeightKg = useSelector(selectCurrentWeightKg);
  const goalsWeightKg = useSelector(selectGoalsWeightKg);
  const heaviestKg = useSelector(selectHeaviestKg);
  const lightestKg = useSelector(selectLightestKg);

  const totalPoints = useSelector(selectTotalPoints);
  const currentStreak = useSelector(selectCurrentStreak);
  const longestStreak = useSelector(selectLongestStreak);
  const weekByDate = useSelector(selectWeekByDate);
  const rewardStatus = useSelector(selectRewardStatus);
  const completedWorkouts = useSelector(
    (s: RootState) => s.workout.completedDayIds.length,
  );

  const photos = useSelector((s: RootState) => s.photo.photos);
  const photoStatus = useSelector((s: RootState) => s.photo.status);
  const uploadStatus = useSelector((s: RootState) => s.photo.uploadStatus);

  const latestPRs = useSelector(selectLatestPRs);
  const weeklyPRCount = useSelector(selectWeeklyPRCount);
  const prStatus = useSelector(selectPRStatus);

  // Safety-net bootstrap. The chained dispatch from loadWorkoutBootstrap only
  // fires on first-time plan generation, so already-onboarded users on the
  // build that ships this feature would otherwise never load weight data.
  useEffect(() => {
    if (userId && weightStatus === "idle") {
      dispatch(loadWeightBootstrap(userId));
    }
  }, [dispatch, userId, weightStatus]);

  // Same safety-net for the reward slice — it's chained off
  // loadWorkoutBootstrap, which doesn't re-run for already-onboarded users.
  useEffect(() => {
    if (userId && rewardStatus === "idle") {
      dispatch(loadRewardBootstrap(userId));
    }
  }, [dispatch, userId, rewardStatus]);

  // Photos slice is non-persisted, so fetch on mount whenever we don't have
  // them cached yet for this session.
  useEffect(() => {
    if (userId && photoStatus === "idle") {
      dispatch(loadProgressPhotos());
    }
  }, [dispatch, userId, photoStatus]);

  // PR slice is non-persisted — fetch on mount when missing.
  useEffect(() => {
    if (userId && prStatus === "idle") {
      dispatch(loadPRBootstrap(userId));
    }
  }, [dispatch, userId, prStatus]);
  const { points: weeklyPoints, ticks: weeklyTicks } =
    useSelector(selectWeeklyChartPoints);
  const yRange = useSelector(selectChartYRange);
  const bmi = useSelector(selectBmi);
  const heightLabel = useSelector(selectHeightLabel);
  const goalsHeight = useSelector((s: RootState) => s.weight.goalsHeight);
  const goalsHeightUnit = useSelector(
    (s: RootState) => s.weight.goalsHeightUnit,
  );

  const weekDays = useMemo(
    () => buildWeekDays(weekByDate, i18n.language),
    [weekByDate, i18n.language],
  );

  const prEntries: PrEntry[] = useMemo(
    () =>
      latestPRs.slice(0, 3).map((pr, idx) => {
        const localizedName = pr.exerciseNameTranslations
          ? getLocalizedText(pr.exerciseNameTranslations, i18n.language, pr.exerciseName)
          : pr.exerciseName;
        const categoryKey = CATEGORY_LABEL_KEYS[pr.exerciseCategory];
        const category = categoryKey ? t(categoryKey) : pr.exerciseCategory;
        const dateLabel = new Date(pr.achievedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
        });
        const delta =
          pr.previousWeightKg != null && pr.previousWeightKg > 0
            ? Math.max(0, pr.weightKg - pr.previousWeightKg)
            : undefined;
        return {
          id: pr.id,
          category,
          name: localizedName,
          weightKg: pr.weightKg,
          reps: pr.reps ?? 0,
          dateLabel,
          isLatest: idx === 0,
          deltaKg: delta,
        };
      }),
    [latestPRs, i18n.language, t],
  );

  const handleLogWeight = (value: number, unit: "kg" | "lb") => {
    if (!userId) return;
    const weightKg = unit === "lb" ? value * LB_TO_KG : value;
    dispatch(logWeightThunk({ userId, weightKg }));
  };

  const handleLogHeight = (value: number, unit: "cm" | "ft") => {
    if (!userId) return;
    dispatch(updateHeightThunk({ userId, height: value, heightUnit: unit }));
  };

  const currentWeek = useSelector(selectCurrentWeekNumber) ?? 0;
  const programDurationWeeks = useSelector(
    (s: RootState) => s.workout.overview?.program.duration_weeks ?? 12,
  );
  const phases: PlanPhase[] = useMemo(
    () => buildPlanPhases(currentWeek, programDurationWeeks, t),
    [currentWeek, programDurationWeeks, t],
  );

  const openPrHistory = () =>
    navigation.navigate("PrHistory", {
      title: t("progress.prHistory.title"),
      subtitle: t("progress.prHistory.eyebrow"),
    });

  const openTransformationGallery = () =>
    navigation.navigate("TransformationGallery", {
      title: t("progress.transformationTitle"),
      subtitle: t("progress.photosCount", { count: 21 }),
    });

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <ScreenHeader title={t("progress.title")} eyebrow={t("progress.eyebrow")} />

        <ProgressStatsCard
          stats={[
            { Icon: ProgressMedal, value: completedWorkouts, label: t("progress.statsWorkouts") },
            { Icon: ProgressFlag, value: totalPoints, label: t("progress.statsEraPoints") },
            { Icon: ProgressFire, value: currentStreak, label: t("progress.statsDayStreak") },
          ]}
        />

        <LeaderboardCard onPress={() => navigation.navigate("Leaderboard")} />

        <View style={styles.section}>
          <SectionHeader title={t("progress.historyTitle")} />
          <HistoryCard
            days={weekDays}
            phases={phases}
            streakCount={currentStreak}
            personalBestReps={longestStreak}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title={t("progress.prsTitle")}
            actionLabel={prEntries.length > 0 ? t("progress.viewAll") : undefined}
            onAction={prEntries.length > 0 ? openPrHistory : undefined}
          />
          {prEntries.length > 0 ? (
            <>
              {weeklyPRCount > 0 ? (
                <SuccessBanner
                  text={t("progress.prsBanner", { count: weeklyPRCount })}
                />
              ) : null}
              <PrCarousel entries={prEntries} />
            </>
          ) : (
            <View style={styles.prEmpty}>
              <Text style={styles.prEmptyTitle}>{t("progress.prsEmptyTitle")}</Text>
              <Text style={styles.prEmptySubtitle}>
                {t("progress.prsEmptySubtitle")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title={t("progress.weightTitle")}
            actionLabel={t("progress.logWeight")}
            onAction={() => logWeightSheetRef.current?.show()}
          />
          <WeightStatsCard
            currentKg={currentWeightKg !== null ? Math.round(currentWeightKg * 10) / 10 : null}
            heaviestKg={heaviestKg}
            lightestKg={lightestKg}
            chartData={weeklyPoints}
            chartXTickLabels={weeklyTicks}
            chartYMin={yRange.yMin}
            chartYMax={yRange.yMax}
            chartYStep={yRange.yStep}
            bmi={bmi}
            heightLabel={heightLabel}
            bannerText={t("progress.weightBanner")}
            onEditHeight={() => logHeightSheetRef.current?.show()}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title={t("progress.transformationTitle")}
            actionLabel={t("progress.viewAll")}
            subtitle={t("progress.photosCount", { count: photos.length })}
            onAction={openTransformationGallery}
          />
          <PhotoStrip
            photos={photos.map((p) => ({
              id: p.id,
              date: formatPhotoDate(p.createdAt),
              imageUri: p.signedUrl,
            }))}
            onAddPhoto={() => addPhotoSheetRef.current?.show()}
            onPhotoPress={(photo) =>
              photoPreviewSheetRef.current?.show({
                source: photo.imageUri ? { uri: photo.imageUri } : undefined,
                dateLabel: photo.date,
              })
            }
          />
        </View>
      </ScrollView>

      <ScreenFades />

      <AddPhotoBottomSheet
        ref={addPhotoSheetRef}
        onPhotoSelected={async (photo) => {
          if (uploadStatus === "uploading") return;
          const action = await dispatch(
            uploadProgressPhotoThunk({ localUri: photo.uri }),
          );
          if (uploadProgressPhotoThunk.fulfilled.match(action)) {
            const { pointsAwarded, row } = action.payload;
            Toast.show({
              type: "success",
              text2:
                pointsAwarded > 0
                  ? t("progress.addPhoto.uploadedWithPoints", { points: pointsAwarded })
                  : t("progress.addPhoto.uploadedNoPoints"),
              visibilityTime: 2500,
            });
            photoPreviewSheetRef.current?.show({
              source: row.signedUrl
                ? { uri: row.signedUrl }
                : { uri: photo.uri },
              dateLabel: formatPhotoDate(row.createdAt),
            });
          } else {
            Toast.show({
              type: "error",
              text2: t("progress.addPhoto.uploadFailed"),
              visibilityTime: 3000,
            });
          }
        }}
      />
      <PhotoPreviewBottomSheet ref={photoPreviewSheetRef} />
      <LogWeightBottomSheet
        ref={logWeightSheetRef}
        initialKg={currentWeightKg ?? goalsWeightKg ?? 70}
        onLog={handleLogWeight}
      />
      <LogHeightBottomSheet
        ref={logHeightSheetRef}
        initialCm={
          goalsHeightUnit === "cm" && goalsHeight ? goalsHeight : 180
        }
        initialUnit={goalsHeightUnit}
        initialValue={goalsHeight ?? undefined}
        onLog={handleLogHeight}
      />
    </View>
  );
};

export default ProgressScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scrollContent: { paddingHorizontal: 16, gap: 32 },
  section: { gap: 16 },
  prEmpty: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 20,
    gap: 6,
    alignItems: "center",
  },
  prEmptyTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: "#F0F0F0",
  },
  prEmptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "rgba(240,240,240,0.5)",
    textAlign: "center",
  },
});
