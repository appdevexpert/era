import AddPhotoBottomSheet, {
  type AddPhotoBottomSheetRef,
} from "@/app/components/common/AddPhotoBottomSheet";
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
import PhotoStrip, { type ProgressPhoto } from "@/app/components/progress/PhotoStrip";
import PrCarousel from "@/app/components/progress/PrCarousel";
import { type PrEntry } from "@/app/components/progress/PrCard";
import ProgressStatsCard from "@/app/components/progress/ProgressStatsCard";
import SectionHeader from "@/app/components/progress/SectionHeader";
import SuccessBanner from "@/app/components/progress/SuccessBanner";
import WeightStatsCard from "@/app/components/progress/WeightStatsCard";
import { type PlanPhase } from "@/app/components/workout/PlanProgressBar";
import { type ChartPoint } from "@/app/components/workout/WeightProgressChart";
import { type HomeStackParamList } from "@/app/navigation/types";
import { ProgressFire, ProgressFlag, ProgressMedal } from "@/assets/icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const WEIGHT_CHART_DATA: ChartPoint[] = [
  { label: "01", value: 81 },
  { label: "03", value: 81.2 },
  { label: "05", value: 81.5 },
  { label: "07", value: 82 },
  { label: "09", value: 82.5 },
  { label: "10", value: 84 },
];

const PHOTOS: ProgressPhoto[] = [
  { id: "1", date: "May 21" },
  { id: "2", date: "May 20" },
  { id: "3", date: "May 18" },
  { id: "4", date: "May 17" },
  { id: "5", date: "May 12" },
];

const ProgressScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const addPhotoSheetRef = useRef<AddPhotoBottomSheetRef>(null);
  const logWeightSheetRef = useRef<LogWeightBottomSheetRef>(null);
  const logHeightSheetRef = useRef<LogHeightBottomSheetRef>(null);

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
            { Icon: ProgressMedal, value: 22, label: t("progress.statsWorkouts") },
            { Icon: ProgressFlag, value: 2840, label: t("progress.statsEraPoints") },
            { Icon: ProgressFire, value: 4, label: t("progress.statsDayStreak") },
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
            currentKg={82.4}
            heaviestKg={84.3}
            lightestKg={81.2}
            chartData={WEIGHT_CHART_DATA}
            chartYMin={80}
            chartYMax={84}
            bmi={18.5}
            heightLabel="5ft 11in"
            bannerText={t("progress.weightBanner")}
            onEditHeight={() => logHeightSheetRef.current?.show()}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title={t("progress.transformationTitle")}
            actionLabel={t("progress.viewAll")}
            subtitle={t("progress.photosCount", { count: 21 })}
            onAction={openTransformationGallery}
          />
          <PhotoStrip
            photos={PHOTOS}
            onAddPhoto={() => addPhotoSheetRef.current?.show()}
          />
        </View>
      </ScrollView>

      <ScreenFades />

      <AddPhotoBottomSheet ref={addPhotoSheetRef} />
      <LogWeightBottomSheet ref={logWeightSheetRef} initialKg={82} />
      <LogHeightBottomSheet ref={logHeightSheetRef} initialCm={180} />
    </View>
  );
};

export default ProgressScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scrollContent: { paddingHorizontal: 20, gap: 32 },
  section: { gap: 16 },
});
