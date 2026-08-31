import PlanProgressBar from "@/app/components/workout/PlanProgressBar";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import {
  selectHasWorkoutBootstrap,
  selectWorkoutOverview,
  selectWorkoutError,
  selectWorkoutStatus,
} from "@/app/stores/selectors/workoutSelectors";
import { loadWorkoutBootstrap, prefetchAllDays } from "@/app/stores/slice/workoutSlice";
import { setHasSeenPlanAdjustmentSheet } from "@/app/stores/slice/preferencesSlice";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import type {
  WorkoutPlanRolledOverView,
  WorkoutPlanWeekView,
  WorkoutDayStatus,
} from "@/app/types/workout";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { mapWorkoutPlan } from "@/app/utils/workoutMappers";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import GlassFill from "@/app/components/common/GlassFill";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdjustmentInfoBottomSheet, { type AdjustmentInfoBottomSheetRef } from "@/app/components/workout/AdjustmentInfoBottomSheet";
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import Svg, { Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InfoCircleGold, MedalBadge } from "@/assets/icons";
import ScreenFades from "@/app/components/common/ScreenFades";
import { workoutErrorMessage } from "@/app/utils/workoutErrors";

type DayPill = WorkoutPlanWeekView["days"][number];

const DashedTimeline = ({ isCurrentWeek }: { isCurrentWeek: boolean }) => {
  const [height, setHeight] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setHeight(event.nativeEvent.layout.height);
  }, []);

  const strokeColor = isCurrentWeek
    ? COLORS.primary.dark
    : "rgba(255, 255, 255, 0.24)";

  return (
    <View style={styles.timelineLine} onLayout={onLayout}>
      {height > 0 ? (
        <Svg width={2} height={height}>
          <Line
            x1={1}
            y1={0}
            x2={1}
            y2={height}
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray="8,8"
          />
        </Svg>
      ) : null}
    </View>
  );
};

const getDayPillColors = (status: WorkoutDayStatus, isToday = false) => {
  // Today + completed = gold-to-green gradient (special state)
  if (status === "completed" && isToday) {
    return {
      pillBg: ["rgba(201,168,76,0.35)", "rgba(4,95,16,0.35)"] as const,
      circleBg: "rgba(61,202,122,0.2)",
      textColor: COLORS.semantic.success,
    };
  }

  switch (status) {
    case "completed":
      return {
        pillBg: ["rgba(10,10,10,0.35)", "rgba(4,95,16,0.35)"] as const,
        circleBg: "rgba(61,202,122,0.2)",
        textColor: COLORS.semantic.success,
      };
    case "missed":
      return {
        pillBg: ["rgba(10,10,10,0.35)", "rgba(230,119,119,0.35)"] as const,
        circleBg: "rgba(230,119,119,0.2)",
        textColor: COLORS.semantic.danger,
      };
    case "active":
      return {
        pillBg: ["rgba(201,168,76,0.35)", "rgba(201,168,76,0.35)"] as const,
        circleBg: COLORS.primary.dark,
        textColor: COLORS.neutral.white,
      };
    case "future":
    default:
      return {
        pillBg: ["transparent", "transparent"] as const,
        circleBg: "#1B1B1B",
        textColor: COLORS.neutral.white,
      };
  }
};

const DayPillItem = ({ pill, onPress }: { pill: DayPill; onPress?: () => void }) => {
  const colors = getDayPillColors(pill.status, pill.isToday);
  const hasGradient = pill.status !== "future";
  const Wrapper = onPress ? PressableScale : View;

  return (
    <Wrapper style={styles.dayPillShadow} onPress={onPress}>
      <View style={styles.dayPillOuter}>
        <GlassFill effect="clear" scheme="light" style={styles.dayPillFill} />
        {hasGradient ? (
          <LinearGradient
            pointerEvents="none"
            colors={[...colors.pillBg]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.dayPillFill}
          />
        ) : null}
        <Text style={styles.dayDate}>{pill.date}</Text>
        <View style={[styles.dayCircle, { backgroundColor: colors.circleBg }]}>
          <Text style={[styles.dayText, { color: colors.textColor }]}>
            {pill.dayLabel}
          </Text>
        </View>
      </View>
    </Wrapper>
  );
};

const WeekBadge = ({ weekNumber }: { weekNumber: number }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.weekBadgeShadow}>
      <View style={styles.weekBadge}>
        <GlassFill effect="clear" scheme="light" style={styles.dayPillFill} />
        <Text style={styles.weekBadgeText}>
          {t("workout.ui.weekBadge", { number: weekNumber })}
        </Text>
        <MedalBadge width={24} height={24} />
      </View>
    </View>
  );
};

const PILLS_PER_ROW = 4;

const WeekSection = ({ week, isLast, onDayPress }: { week: WorkoutPlanWeekView; isLast: boolean; onDayPress: (pill: DayPill) => void }) => {
  const { t } = useTranslation();

  // Dynamic row chunking: rows of 4 pills max, badge in last row
  const rows: DayPill[][] = [];
  for (let i = 0; i < week.days.length; i += PILLS_PER_ROW) {
    rows.push(week.days.slice(i, i + PILLS_PER_ROW));
  }
  // Ensure badge has room in last row (max 3 pills + badge)
  if (rows.length === 0 || rows[rows.length - 1].length >= PILLS_PER_ROW) {
    rows.push([]);
  }

  return (
    <View style={[styles.weekSection, !week.isCurrentWeek && styles.weekDimmed]}>
      <View style={styles.weekHeader}>
        <View style={styles.weekHeaderLeft}>
          <Text style={styles.weekTitle}>{week.title}</Text>
          <Text style={styles.weekPhase}>{week.phase}</Text>
        </View>
        {week.isCurrentWeek ? (
          <Text style={styles.weekDays}>
            {t("workout.ui.daysCount", {
              completed: week.completedDays,
              total: week.totalDays,
            })}
          </Text>
        ) : null}
      </View>

      <View style={styles.weekBody}>
        {!isLast && <DashedTimeline isCurrentWeek={week.isCurrentWeek} />}

        <View style={[styles.daysCard, isLast && styles.daysCardNoTimeline]}>
          {rows.map((row, rowIndex) => {
            const isLastRow = rowIndex === rows.length - 1;
            const filled = row.length + (isLastRow ? 1 : 0);

            return (
              <View key={rowIndex} style={styles.daysRow}>
                {row.map((pill) => (
                  <View
                    key={`${week.weekNumber}-${pill.date}-${pill.dayLabel}`}
                    style={styles.dayCell}
                  >
                    <DayPillItem pill={pill} onPress={() => onDayPress(pill)} />
                  </View>
                ))}
                {isLastRow ? (
                  <View style={styles.dayCell}>
                    <WeekBadge weekNumber={week.weekNumber} />
                  </View>
                ) : null}
                {Array.from({ length: PILLS_PER_ROW - filled }, (_, index) => (
                  <View key={`spacer-${index}`} style={styles.dayCell} />
                ))}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const RolledOverSection = ({ section, isLast, onDayPress, onInfoPress }: { section: WorkoutPlanRolledOverView; isLast: boolean; onDayPress: (pill: DayPill) => void; onInfoPress: () => void }) => {
  const { t } = useTranslation();

  const rows: DayPill[][] = [];
  for (let i = 0; i < section.days.length; i += PILLS_PER_ROW) {
    rows.push(section.days.slice(i, i + PILLS_PER_ROW));
  }

  return (
    <View style={[styles.weekSection, !section.isCurrent && styles.weekDimmed]}>
      <View style={styles.weekHeader}>
        <View style={styles.weekHeaderLeft}>
          <Text style={styles.weekTitle}>{t("workout.ui.rolledOverDays")}</Text>
          <Text style={styles.weekPhase}>{section.phase}</Text>
        </View>
      </View>

      <View style={styles.weekBody}>
        {!isLast && <DashedTimeline isCurrentWeek={section.isCurrent} />}

        <View style={[styles.daysCard, isLast && styles.daysCardNoTimeline]}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.daysRow}>
              {row.map((pill) => (
                <View key={`rolled-${pill.programDayId}`} style={styles.dayCell}>
                  <DayPillItem pill={pill} onPress={() => onDayPress(pill)} />
                </View>
              ))}
              {Array.from({ length: PILLS_PER_ROW - row.length }, (_, index) => (
                <View key={`spacer-${index}`} style={styles.dayCell} />
              ))}
            </View>
          ))}
        </View>
      </View>

      <PressableScale style={styles.infoRow} onPress={onInfoPress}>
        <InfoCircleGold width={18} height={18} />
        <Text style={styles.infoText}>
          {t("workout.ui.weekAdjustedNote", { week: section.sourceWeekNumber })}
        </Text>
      </PressableScale>
    </View>
  );
};

const WorkoutPlanScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "WorkoutPlan">>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const overview = useSelector(selectWorkoutOverview);
  const programStartDate = useSelector((state: RootState) => state.auth.programStartDate);
  const completedDayIds = useSelector((state: RootState) => state.workout.completedDayIds);
  const hasSeenPlanAdjustmentSheet = useSelector(
    (state: RootState) => state.preferences.hasSeenPlanAdjustmentSheet,
  );
  const plan = useMemo(
    () => (overview ? mapWorkoutPlan(overview, i18n.language, programStartDate, completedDayIds) : null),
    [i18n.language, overview, programStartDate, completedDayIds],
  );
  const workoutStatus = useSelector(selectWorkoutStatus);
  const workoutError = useSelector(selectWorkoutError);
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);
  const isLoading = workoutStatus === "idle" || workoutStatus === "loading";
  const errorMessage = workoutErrorMessage(t, workoutError);

  const adjustmentSheetRef = useRef<AdjustmentInfoBottomSheetRef>(null);

  useEffect(() => {
    if (!hasWorkoutBootstrap && workoutStatus === "idle") {
      dispatch(loadWorkoutBootstrap({ programId: route.params?.programId }));
    }
  }, [dispatch, hasWorkoutBootstrap, route.params?.programId, workoutStatus]);

  // Safety-net prefetch — covers existing users who updated the app without
  // re-running PlanGeneration. prefetchAllDays internally filters out days
  // already cached, so re-firing is a cheap no-op once the cache is warm.
  useEffect(() => {
    if (hasWorkoutBootstrap) {
      dispatch(prefetchAllDays());
    }
  }, [dispatch, hasWorkoutBootstrap]);

  // Auto-show adjustment sheet ONCE per user when plan started mid-week
  // (hasAdjustment is false for Monday-start, so it never triggers there).
  // Persisted via preferences.hasSeenPlanAdjustmentSheet so it does not
  // re-appear on every screen visit.
  useEffect(() => {
    if (!plan?.hasAdjustment || hasSeenPlanAdjustmentSheet) return;
    const timer = setTimeout(() => {
      adjustmentSheetRef.current?.show(
        t("workout.ui.adjustmentTitle"),
        t("workout.ui.adjustmentMessage"),
      );
      dispatch(setHasSeenPlanAdjustmentSheet(true));
    }, 600);
    return () => clearTimeout(timer);
  }, [dispatch, hasSeenPlanAdjustmentSheet, plan?.hasAdjustment, t]);

  const handleInfoPress = useCallback((sourceWeekNumber: number) => {
    adjustmentSheetRef.current?.show(
      t("workout.ui.adjustmentWeek4Title"),
      t("workout.ui.adjustmentWeek4Message", { week: sourceWeekNumber }),
    );
  }, [t]);

  const handleDayPress = useCallback((pill: DayPill) => {
    navigation.navigate("ExerciseList", {
      programId: route.params?.programId,
      programDayId: pill.programDayId,
      title: pill.title,
      subtitle: pill.subtitle,
      muscles: pill.muscles,
      dayStatus: pill.status,
    });
  }, [navigation, route.params?.programId]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 120, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {plan ? (
          <>
            <View style={styles.progressBarSection}>
              <PlanProgressBar phases={plan.phases} />
            </View>

            {plan.weeks.map((week, index) => {
              const isLastWeek = index === plan.weeks.length - 1;
              const matchingRolledOver = plan.rolledOver.find(
                (r) => r.afterWeekNumber === week.weekNumber,
              );
              const isProgramLast = isLastWeek && !matchingRolledOver;
              return (
                <React.Fragment key={week.weekNumber}>
                  <WeekSection
                    week={week}
                    isLast={isProgramLast}
                    onDayPress={handleDayPress}
                  />
                  {matchingRolledOver ? (
                    <RolledOverSection
                      section={matchingRolledOver}
                      isLast={isLastWeek}
                      onDayPress={handleDayPress}
                      onInfoPress={() => handleInfoPress(matchingRolledOver.sourceWeekNumber)}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </>
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              {isLoading ? t("workout.ui.loadingWorkout") : errorMessage}
            </Text>
          </View>
        )}
       
      </ScrollView>

      <ScreenFades />
      
      <AdjustmentInfoBottomSheet ref={adjustmentSheetRef} />
    </View>
  );
};

export default WorkoutPlanScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(20),
  },
  progressBarSection: {
    marginTop: 10,
    marginBottom: verticalScale(24),
  },
  weekSection: {
    marginBottom: verticalScale(16),
  },
  weekDimmed: {
    opacity: 0.6,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: verticalScale(6),
  },
  weekHeaderLeft: {
    gap: 6,
  },
  weekTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 24,
  },
  weekPhase: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.primary.dark,
    textTransform: "uppercase",
    letterSpacing: 0.48,
    lineHeight: 14.4,
  },
  weekDays: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(240,240,240,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.56,
    lineHeight: 16.8,
  },
  weekBody: {
    flexDirection: "row",
    marginTop: verticalScale(8),
  },
  timelineLine: {
    width: 14,
    alignItems: "center",
    marginRight: 8,
  },
  daysCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 16,
    padding: 16,
    gap: 24,
  },
  daysCardNoTimeline: {
    marginLeft: 22,
  },
  // Every row is PILLS_PER_ROW equal-width cells — partial rows are padded with
  // empty cells — so pills sit in the same columns on every row and the week
  // badge can never push the row past the card width (it did on Android, where
  // 3 pills + badge + 32px gaps overflowed and squashed the pills).
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3.08 },
    shadowOpacity: 0.25,
    shadowRadius: 3.08,
    elevation: 4,
    borderRadius: 77,
  },
  dayPillOuter: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 77,
    overflow: "hidden",
  },
  dayPillFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 77,
  },
  dayDate: {
    includeFontPadding: false,
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.neutral.white,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.56,
    lineHeight: 14,
  },
  dayCircle: {
    width: 36,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    includeFontPadding: false,
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 12,
  },
  weekBadgeShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3.08 },
    shadowOpacity: 0.25,
    shadowRadius: 3.08,
    elevation: 4,
    borderRadius: 77,
  },
  weekBadge: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 12,
    width: 52,
    height: 74,
    justifyContent: "center",
    borderRadius: 77,
    overflow: "hidden",
  },
  weekBadgeText: {
    includeFontPadding: false,
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.neutral.white,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.56,
    lineHeight: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: verticalScale(8),
    marginLeft: 22,
  },
  infoText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(240,240,240,0.6)",
    lineHeight: 15.6,
  },
  statusBox: {
    minHeight: verticalScale(320),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(240,240,240,0.72)",
    textAlign: "center",
  },
});
