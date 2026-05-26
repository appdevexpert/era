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
import SectionHeader from "@/app/components/progress/SectionHeader";
import SuccessBanner from "@/app/components/progress/SuccessBanner";
import WeightStatsCard from "@/app/components/progress/WeightStatsCard";
import { type PlanPhase } from "@/app/components/workout/PlanProgressBar";
import { type HomeStackParamList } from "@/app/navigation/types";
import {
  loadProgressPhotos,
  uploadProgressPhotoThunk,
} from "@/app/stores/slice/photoSlice";
import { loadRewardBootstrap } from "@/app/stores/slice/rewardSlice";
import {
  loadWeightBootstrap,
  logWeightThunk,
  updateHeightThunk,
} from "@/app/stores/slice/weightSlice";
import {
  selectCurrentStreak,
  selectRewardStatus,
  selectTotalPoints,
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
import { useAppDispatch } from "@/app/stores/store";
import { ProgressFire, ProgressFlag, ProgressMedal } from "@/assets/icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootState } from "@/app/stores/store";

const PR_ENTRIES: PrEntry[] = [
  { id: "1", category: "Chest • Compound", name: "Deadlift", weightKg: 140, reps: 4, dateLabel: "Apr 20", isLatest: true, deltaKg: 5 },
  { id: "2", category: "Chest • Compound", name: "Bench Press", weightKg: 140, reps: 4, dateLabel: "Apr 18", deltaKg: 5 },
  { id: "3", category: "Chest • Compound", name: "Squats", weightKg: 140, reps: 4, dateLabel: "Apr 08", deltaKg: 5 },
];

const WEEK_DAYS: HistoryDay[] = [
  { label: "SUN", date: "03", state: "completed" },
  { label: "MON", date: "04", state: "active" },
  { label: "TUE", date: "05", state: "missed" },
  { label: "WED", date: "06", state: "upcoming" },
  { label: "THU", date: "07", state: "upcoming" },
  { label: "FRI", date: "08", state: "upcoming" },
  { label: "SAT", date: "09", state: "upcoming" },
];

const LB_TO_KG = 0.45359237;

const formatPhotoDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" });

const ProgressScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
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
  const rewardStatus = useSelector(selectRewardStatus);
  const completedWorkouts = useSelector(
    (s: RootState) => s.workout.completedDayIds.length,
  );

  const photos = useSelector((s: RootState) => s.photo.photos);
  const photoStatus = useSelector((s: RootState) => s.photo.status);
  const uploadStatus = useSelector((s: RootState) => s.photo.uploadStatus);

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
  const { points: weeklyPoints, ticks: weeklyTicks } =
    useSelector(selectWeeklyChartPoints);
  const yRange = useSelector(selectChartYRange);
  const bmi = useSelector(selectBmi);
  const heightLabel = useSelector(selectHeightLabel);
  const goalsHeight = useSelector((s: RootState) => s.weight.goalsHeight);
  const goalsHeightUnit = useSelector(
    (s: RootState) => s.weight.goalsHeightUnit,
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

  const phases: PlanPhase[] = [
    { label: t("progress.phaseHypertrophy"), active: true, progress: 0.65 },
    { label: t("progress.phaseStrength"), active: false, progress: 0 },
    { label: t("progress.phasePeak"), active: false, progress: 0 },
  ];

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
            days={WEEK_DAYS}
            phases={phases}
            streakCount={2}
            personalBestReps={4}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title={t("progress.prsTitle")}
            actionLabel={t("progress.viewAll")}
            onAction={openPrHistory}
          />
           <SuccessBanner text={t("progress.prsBanner", { count: 8 })} />
           
          <PrCarousel entries={PR_ENTRIES} />
         
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
});
