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
import { loadWorkoutBootstrap } from "@/app/stores/slice/workoutSlice";
import { useAppDispatch, type RootState } from "@/app/stores/store";
import type {
  WorkoutPlanWeekView,
  WorkoutDayStatus,
} from "@/app/types/workout";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { mapWorkoutPlan } from "@/app/utils/workoutMappers";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdjustmentInfoSheet, { type AdjustmentInfoSheetRef } from "@/app/components/workout/AdjustmentInfoSheet";
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import Svg, { Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InfoCircleGold, MedalBadge } from "@/assets/icons";

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
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper style={styles.dayPillShadow} onPress={onPress}>
      <View style={styles.dayPillOuter}>
        <GlassView
          pointerEvents="none"
          glassEffectStyle="clear"
          colorScheme="light"
          style={styles.dayPillFill}
        />
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
        <GlassView
          pointerEvents="none"
          glassEffectStyle="clear"
          colorScheme="light"
          style={styles.dayPillFill}
        />
        <Text style={styles.weekBadgeText}>
          {t("workout.ui.weekBadge", { number: weekNumber })}
        </Text>
        <MedalBadge width={24} height={24} />
      </View>
    </View>
  );
};

const PILLS_PER_ROW = 4;

const WeekSection = ({ week, isLast, hasAdjustment, onDayPress, onInfoPress }: { week: WorkoutPlanWeekView; isLast: boolean; hasAdjustment: boolean; onDayPress: (pill: DayPill) => void; onInfoPress: (weekNumber: number) => void }) => {
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
            const fullRow = row.length === PILLS_PER_ROW && !isLastRow;

            return (
              <View key={rowIndex} style={fullRow ? styles.daysRow : styles.daysRow2}>
                {row.map((pill) => (
                  <DayPillItem
                    key={`${week.weekNumber}-${pill.date}-${pill.dayLabel}`}
                    pill={pill}
                    onPress={week.isLocked || pill.isRestDay ? undefined : () => onDayPress(pill)}
                  />
                ))}
                {isLastRow && <WeekBadge weekNumber={week.weekNumber} />}
              </View>
            );
          })}
        </View>
      </View>

      {week.weekNumber === 1 && hasAdjustment ? (
        <Pressable style={styles.infoRow} onPress={() => onInfoPress(1)}>
          <InfoCircleGold width={18} height={18} />
          <Text style={styles.infoText}>{t("workout.ui.weekInitialNote")}</Text>
        </Pressable>
      ) : null}
      {week.weekNumber === 4 && hasAdjustment ? (
        <Pressable style={styles.infoRow} onPress={() => onInfoPress(4)}>
          <InfoCircleGold width={18} height={18} />
          <Text style={styles.infoText}>{t("workout.ui.weekAdjustedNote")}</Text>
        </Pressable>
      ) : null}
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
  const plan = useMemo(
    () => (overview ? mapWorkoutPlan(overview, i18n.language, programStartDate, completedDayIds) : null),
    [i18n.language, overview, programStartDate, completedDayIds],
  );
  const workoutStatus = useSelector(selectWorkoutStatus);
  const workoutError = useSelector(selectWorkoutError);
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap);
  const isLoading = workoutStatus === "idle" || workoutStatus === "loading";
  const errorMessage = workoutError ?? t("workout.ui.unableToLoadWorkout");

  const adjustmentSheetRef = useRef<AdjustmentInfoSheetRef>(null);
  const hasAutoShown = useRef(false);

  useEffect(() => {
    if (!hasWorkoutBootstrap && workoutStatus === "idle") {
      dispatch(loadWorkoutBootstrap({ programId: route.params?.programId }));
    }
  }, [dispatch, hasWorkoutBootstrap, route.params?.programId, workoutStatus]);

  // Auto-show adjustment sheet on first visit if mid-week start
  useEffect(() => {
    if (plan?.hasAdjustment && !hasAutoShown.current) {
      hasAutoShown.current = true;
      // Small delay to let the sheet mount
      setTimeout(() => {
        adjustmentSheetRef.current?.show(
          t("workout.ui.adjustmentTitle"),
          t("workout.ui.adjustmentMessage"),
        );
      }, 600);
    }
  }, [plan?.hasAdjustment, t]);

  const handleInfoPress = useCallback((weekNumber: number) => {
    if (weekNumber === 4) {
      adjustmentSheetRef.current?.show(
        t("workout.ui.adjustmentWeek4Title"),
        t("workout.ui.adjustmentWeek4Message"),
      );
    } else {
      adjustmentSheetRef.current?.show(
        t("workout.ui.adjustmentTitle"),
        t("workout.ui.adjustmentMessage"),
      );
    }
  }, [t]);

  const handleDayPress = useCallback((pill: DayPill) => {
    navigation.navigate("ExerciseList", {
      programId: route.params?.programId,
      programDayId: pill.programDayId,
      title: pill.title,
      subtitle: pill.subtitle,
      muscles: pill.muscles,
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

            {plan.weeks.map((week, index) => (
              <WeekSection key={week.weekNumber} week={week} isLast={index === plan.weeks.length - 1} hasAdjustment={plan.hasAdjustment} onDayPress={handleDayPress} onInfoPress={handleInfoPress} />
            ))}
          </>
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              {isLoading ? t("workout.ui.loadingWorkout") : errorMessage}
            </Text>
          </View>
        )}
      </ScrollView>

      <AdjustmentInfoSheet ref={adjustmentSheetRef} />
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
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  daysRow2: {
    flexDirection: "row",
    gap: 32,
    alignItems: "center",
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
