import ScreenFades from "@/app/components/common/ScreenFades";
import ScreenHeader from "@/app/components/common/ScreenHeader";
import DayHeader from "@/app/components/weight/DayHeader";
import ExerciseSummaryCard from "@/app/components/workout/ExerciseSummaryCard";
import PhaseWeekHeader from "@/app/components/workout/PhaseWeekHeader";
import { type DayItem } from "@/app/components/workout/WeekDaySelector";
import WeightsScreenSkeleton, {
  WeightsCardsSkeleton,
} from "@/app/components/skeleton/WeightsScreenSkeleton";
import { FONTS } from "@/app/constants/fonts";
import { useExerciseSummaries } from "@/app/hooks/useExerciseSummaries";
import type { HomeStackParamList } from "@/app/navigation/types";
import { getProgramDayDetail } from "@/app/services/workoutService";
import { selectCurrentDayDetail, selectWorkoutOverview } from "@/app/stores/selectors/workoutSelectors";
import type { RootState } from "@/app/stores/store";
import type { ExerciseSummaryView, ProgramDayDetailData } from "@/app/types/workout";
import { getLocalizedText } from "@/app/utils/localization";
import {
  computeCurrentPosition,
  computeDateForDay,
  getToday,
  getWeekdayFromDate,
} from "@/app/utils/programSchedule";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WeightsScreen = () => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const reduxDayDetail = useSelector(selectCurrentDayDetail);
  const overview = useSelector(selectWorkoutOverview);
  const programStartDate = useSelector((s: RootState) => s.auth.programStartDate);
  const completedDayIds = useSelector((s: RootState) => s.workout.completedDayIds);

  // Anchor for the program week the user is browsing. Defaults to the
  // current calendar week; chevrons in PhaseWeekHeader navigate 1..12.
  const todaysWeekNumber = useMemo(() => {
    if (!overview || !programStartDate) return 1;
    return computeCurrentPosition({
      programStartDate,
      totalWeeks: overview.program.duration_weeks,
    }).weekNumber;
  }, [overview, programStartDate]);
  const [viewedWeekNumber, setViewedWeekNumber] = useState<number | null>(null);
  const effectiveWeekNumber = viewedWeekNumber ?? todaysWeekNumber;

  // Day the user is *viewing*. Defaults to today (Redux's current day); changes
  // when they tap a past day pill or jump to a different week. Fetched locally
  // without touching Redux so other screens stay anchored on today.
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [overrideDetail, setOverrideDetail] = useState<ProgramDayDetailData | null>(null);
  const [overrideLoading, setOverrideLoading] = useState(false);

  useEffect(() => {
    if (!selectedDayId || selectedDayId === reduxDayDetail?.day.id) {
      setOverrideDetail(null);
      return;
    }
    let cancelled = false;
    setOverrideLoading(true);
    getProgramDayDetail(selectedDayId)
      .then((d) => {
        if (!cancelled) setOverrideDetail(d);
      })
      .catch(() => {
        if (!cancelled) setOverrideDetail(null);
      })
      .finally(() => {
        if (!cancelled) setOverrideLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDayId, reduxDayDetail?.day.id]);

  const detail = overrideDetail ?? reduxDayDetail;

  const { data: exercises, loading: summariesLoading, error } = useExerciseSummaries(detail);
  const loading = summariesLoading || overrideLoading;

  const openExerciseHistory = (ex: ExerciseSummaryView) => {
    navigation.navigate("ExerciseHistory", {
      exerciseId: ex.exerciseLibraryId,
      title: ex.name,
      subtitle: ex.category,
      muscles: ex.muscles,
    });
  };

  const handleDayPress = useCallback((day: DayItem) => {
    // day.key is the program_day_id (set when building the selector below)
    setSelectedDayId(day.key);
  }, []);

  // When the user navigates to a different week, default the selected day to
  // the first non-rest day of that week so the cards have something to show.
  const handleWeekNav = useCallback(
    (delta: 1 | -1) => {
      // Upper bound = today's week; user can't browse weeks they haven't reached.
      // Matches the nutrition tab's canNavigateWeek behavior.
      const next = Math.max(1, Math.min(todaysWeekNumber, effectiveWeekNumber + delta));
      if (next === effectiveWeekNumber) return;
      setViewedWeekNumber(next);

      if (overview) {
        const targetWeek = overview.weeks.find((w) => w.week_number === next);
        if (targetWeek) {
          const dayInWeek = overview.days
            .filter((d) => d.week_id === targetWeek.id)
            .sort((a, b) => a.day_number - b.day_number)
            .find((d) => !d.is_rest_day);
          // If we're returning to today's week, fall back to Redux's day.
          if (next === todaysWeekNumber) {
            setSelectedDayId(null);
          } else if (dayInWeek) {
            setSelectedDayId(dayInWeek.id);
          }
        }
      }
    },
    [effectiveWeekNumber, overview, todaysWeekNumber],
  );

  // Build the 7-day selector for the current program week.
  //   • Pre-signup days (date < programStartDate)   → dashed
  //   • Future days (date > today)                  → dashed
  //   • Past rest days, no session                  → dashed
  //   • Past workout days, no session               → red (missed)
  //   • Past or today, completed                    → green
  //   • Today, not completed                        → yellow (active)
  const days: DayItem[] = useMemo(() => {
    if (!overview || !programStartDate) return [];
    const today = getToday();
    const config = {
      programStartDate,
      totalWeeks: overview.program.duration_weeks,
    };
    const todaysPosition = computeCurrentPosition(config);
    const week = overview.weeks.find((w) => w.week_number === effectiveWeekNumber);
    if (!week) return [];

    const daysInWeek = overview.days
      .filter((d) => d.week_id === week.id)
      .sort((a, b) => a.day_number - b.day_number);

    const completedSet = new Set(completedDayIds);
    const todayDayId =
      effectiveWeekNumber === todaysPosition.weekNumber
        ? daysInWeek.find((d) => d.day_number === todaysPosition.dayNumber)?.id
        : undefined;

    return daysInWeek.map((d) => {
      const dayDate = computeDateForDay(config, effectiveWeekNumber, d.day_number);
      const weekdayIdx = (getWeekdayFromDate(dayDate) - 1) % 7; // 0=Mon
      const dateLabel = dayDate.split("-")[2] ?? "";

      const isPreSignup = dayDate < programStartDate;
      const isFuture = dayDate > today;
      const isToday = dayDate === today;
      const isPast = dayDate < today;
      const isCompleted = !isPreSignup && completedSet.has(d.id);
      // Today stays "active" even when completed so the pill renders the
      // gold-to-green combo (WeekDaySelector's State 3) instead of pure green.
      const isActive = !isPreSignup && (isToday || d.id === todayDayId);
      const isMissed =
        !isPreSignup && !isFuture && isPast && !isCompleted && !d.is_rest_day;

      return {
        key: d.id,
        label: WEEKDAY_LABELS[weekdayIdx] ?? "",
        date: dateLabel,
        title: "",
        subtitle: "",
        muscles: [],
        active: isActive,
        completed: isCompleted,
        missed: isMissed,
      };
    });
  }, [overview, programStartDate, completedDayIds, effectiveWeekNumber]);

  const dayTitle = detail
    ? getLocalizedText(detail.day.title_translations, i18n.language, detail.day.title)
    : "";
  const daySubtitle = detail
    ? getLocalizedText(
        detail.day.subtitle_translations,
        i18n.language,
        detail.day.subtitle ?? "",
      )
    : "";

  const totalWeeks = overview?.program.duration_weeks ?? 12;

  // Phase label = focus of the currently-viewed week
  // (Week 1-4 → Hypertrophy, 5-8 → Strength, 9-12 → Peak — driven by DB, not hard-coded).
  const phaseTitle = useMemo(() => {
    if (!overview) return t("weights.phase");
    const week = overview.weeks.find((w) => w.week_number === effectiveWeekNumber);
    if (!week) return t("weights.phase");
    return getLocalizedText(week.focus_translations, i18n.language, week.focus ?? t("weights.phase"));
  }, [overview, effectiveWeekNumber, i18n.language, t]);

  const isReady = Boolean(detail && overview && programStartDate);
  const showEmpty = isReady && !loading && exercises.length === 0;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
      >
        {
        isReady ? (
          <>
            <ScreenHeader title={t("weights.title")} eyebrow={t("weights.eyebrow")} />

            <PhaseWeekHeader
              title={phaseTitle}
              currentWeek={effectiveWeekNumber}
              totalWeeks={totalWeeks}
              days={days}
              onDayPress={handleDayPress}
              onPrevWeek={() => handleWeekNav(-1)}
              onNextWeek={() => handleWeekNav(1)}
              canGoPrev={effectiveWeekNumber > 1}
              canGoNext={effectiveWeekNumber < todaysWeekNumber}
            />

            <DayHeader
              title={dayTitle}
              subtitle={daySubtitle}
              exerciseCount={exercises.length}
            />

            {error ? (
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{t("weights.error")}</Text>
              </View>
            ) : loading && exercises.length === 0 ? (
              // Card-area-only skeleton — fills the gap between Redux
              // bootstrap completing and the per-exercise Supabase fetch landing.
              <WeightsCardsSkeleton />
            ) : showEmpty ? (
              <View style={styles.statusBox}>
                <Text style={styles.statusTitle}>{t("weights.empty.title")}</Text>
                <Text style={styles.statusText}>{t("weights.empty.subtitle")}</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {exercises.map((ex) => (
                  <ExerciseSummaryCard
                    key={ex.id}
                    category={ex.category}
                    name={ex.name}
                    meta={ex.meta}
                    weightKg={ex.weightKg}
                    delta={ex.delta}
                    onPress={() => openExerciseHistory(ex)}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <WeightsScreenSkeleton />
        )}
      </ScrollView>

      <ScreenFades />
    </View>
  );
};

export default WeightsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 24,
  },
  cardList: {
    gap: 12,
  },
  statusBox: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  statusTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    lineHeight: 22,
    color: "#F0F0F0",
    textAlign: "center",
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(240,240,240,0.72)",
    textAlign: "center",
  },
});
