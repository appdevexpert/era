import PlanProgressBar from "@/app/components/workout/PlanProgressBar";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { InfoCircle, MedalBadge } from "@/assets/icons";
import { LinearGradient } from "expo-linear-gradient";
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line } from "react-native-svg";
import { GlassView } from "expo-glass-effect";
import { useCallback, useState } from "react";

// --- Types ---

type DayStatus = "completed" | "missed" | "active" | "future";

interface DayPill {
  date: string;
  day: string;
  status: DayStatus;
}

interface WeekData {
  weekNumber: number;
  phase: string;
  completedDays: number;
  totalDays: number;
  days: DayPill[];
  isCurrentWeek: boolean;
}

// --- Mock Data ---

const WEEKS: WeekData[] = [
  {
    weekNumber: 1,
    phase: "Hypertrophy",
    completedDays: 1,
    totalDays: 6,
    days: [
      { date: "29", day: "Wed", status: "missed" },
      { date: "30", day: "Thu", status: "completed" },
      { date: "01", day: "Fri", status: "active" },
      { date: "02", day: "Sat", status: "future" },
      { date: "03", day: "Sun", status: "future" },
    ],
    isCurrentWeek: true,
  },
  {
    weekNumber: 2,
    phase: "Hypertrophy",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "04", day: "Mon", status: "future" },
      { date: "05", day: "Tue", status: "future" },
      { date: "06", day: "Wed", status: "future" },
      { date: "07", day: "Thu", status: "future" },
      { date: "08", day: "Fri", status: "future" },
      { date: "09", day: "Sat", status: "future" },
      { date: "10", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
  {
    weekNumber: 3,
    phase: "Hypertrophy",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "11", day: "Mon", status: "future" },
      { date: "12", day: "Tue", status: "future" },
      { date: "13", day: "Wed", status: "future" },
      { date: "14", day: "Thu", status: "future" },
      { date: "15", day: "Fri", status: "future" },
      { date: "16", day: "Sat", status: "future" },
      { date: "17", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
  {
    weekNumber: 4,
    phase: "Hypertrophy",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "18", day: "Mon", status: "future" },
      { date: "19", day: "Tue", status: "future" },
      { date: "20", day: "Wed", status: "future" },
      { date: "21", day: "Thu", status: "future" },
      { date: "22", day: "Fri", status: "future" },
      { date: "23", day: "Sat", status: "future" },
      { date: "24", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
  {
    weekNumber: 5,
    phase: "Strength",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "25", day: "Mon", status: "future" },
      { date: "26", day: "Tue", status: "future" },
      { date: "27", day: "Wed", status: "future" },
      { date: "28", day: "Thu", status: "future" },
      { date: "29", day: "Fri", status: "future" },
      { date: "30", day: "Sat", status: "future" },
      { date: "01", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
  {
    weekNumber: 6,
    phase: "Strength",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "02", day: "Mon", status: "future" },
      { date: "03", day: "Tue", status: "future" },
      { date: "04", day: "Wed", status: "future" },
      { date: "05", day: "Thu", status: "future" },
      { date: "06", day: "Fri", status: "future" },
      { date: "07", day: "Sat", status: "future" },
      { date: "08", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
  {
    weekNumber: 7,
    phase: "Strength",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "09", day: "Mon", status: "future" },
      { date: "10", day: "Tue", status: "future" },
      { date: "11", day: "Wed", status: "future" },
      { date: "12", day: "Thu", status: "future" },
      { date: "13", day: "Fri", status: "future" },
      { date: "14", day: "Sat", status: "future" },
      { date: "15", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
  {
    weekNumber: 8,
    phase: "Strength",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "16", day: "Mon", status: "future" },
      { date: "17", day: "Tue", status: "future" },
      { date: "18", day: "Wed", status: "future" },
      { date: "19", day: "Thu", status: "future" },
      { date: "20", day: "Fri", status: "future" },
      { date: "21", day: "Sat", status: "future" },
      { date: "22", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
  {
    weekNumber: 9,
    phase: "Peak",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "23", day: "Mon", status: "future" },
      { date: "24", day: "Tue", status: "future" },
      { date: "25", day: "Wed", status: "future" },
      { date: "26", day: "Thu", status: "future" },
      { date: "27", day: "Fri", status: "future" },
      { date: "28", day: "Sat", status: "future" },
      { date: "29", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
  {
    weekNumber: 10,
    phase: "Peak",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "30", day: "Mon", status: "future" },
      { date: "01", day: "Tue", status: "future" },
      { date: "02", day: "Wed", status: "future" },
      { date: "03", day: "Thu", status: "future" },
      { date: "04", day: "Fri", status: "future" },
      { date: "05", day: "Sat", status: "future" },
      { date: "06", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
  {
    weekNumber: 11,
    phase: "Peak",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "07", day: "Mon", status: "future" },
      { date: "08", day: "Tue", status: "future" },
      { date: "09", day: "Wed", status: "future" },
      { date: "10", day: "Thu", status: "future" },
      { date: "11", day: "Fri", status: "future" },
      { date: "12", day: "Sat", status: "future" },
      { date: "13", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
  {
    weekNumber: 12,
    phase: "Peak",
    completedDays: 0,
    totalDays: 6,
    days: [
      { date: "14", day: "Mon", status: "future" },
      { date: "15", day: "Tue", status: "future" },
      { date: "16", day: "Wed", status: "future" },
      { date: "17", day: "Thu", status: "future" },
      { date: "18", day: "Fri", status: "future" },
      { date: "19", day: "Sat", status: "future" },
      { date: "20", day: "Sun", status: "future" },
    ],
    isCurrentWeek: false,
  },
];

// --- Sub-components ---

const DashedTimeline = ({ isCurrentWeek }: { isCurrentWeek: boolean }) => {
  const [height, setHeight] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setHeight(e.nativeEvent.layout.height);
  }, []);

  const strokeColor = isCurrentWeek
    ? COLORS.primary.dark
    : "rgba(255, 255, 255, 0.24)";

  return (
    <View style={styles.timelineLine} onLayout={onLayout}>
      {height > 0 && (
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
      )}
    </View>
  );
};

const getDayPillColors = (status: DayStatus) => {
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
        textColor: "#FFFFFF",
      };
    case "future":
    default:
      return {
        pillBg: ["transparent", "transparent"] as const,
        circleBg: "#1B1B1B",
        textColor: "#FFFFFF",
      };
  }
};

const DayPillItem = ({ pill }: { pill: DayPill }) => {
  const colors = getDayPillColors(pill.status);
  const hasGradient = pill.status !== "future";

  return (
    <View style={styles.dayPillShadow}>
      <View style={styles.dayPillOuter}>
        <GlassView
          pointerEvents="none"
          glassEffectStyle="clear"
          colorScheme="dark"
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
            {pill.day}
          </Text>
        </View>
      </View>
    </View>
  );
};

const WeekBadge = ({ weekNumber }: { weekNumber: number }) => (
  <View style={styles.weekBadgeShadow}>
    <View style={styles.weekBadge}>
      <GlassView
        pointerEvents="none"
        glassEffectStyle="clear"
        colorScheme="dark"
        style={styles.dayPillFill}
      />
      <Text style={styles.weekBadgeText}>W{weekNumber}</Text>
      <MedalBadge width={24} height={24} />
    </View>
  </View>
);

const WeekSection = ({ week }: { week: WeekData }) => {
  const row1 = week.days.slice(0, 4);
  const row2 = week.days.slice(4);

  return (
    <View style={[styles.weekSection, !week.isCurrentWeek && styles.weekDimmed]}>
      {/* Week header */}
      <View style={styles.weekHeader}>
        <View style={styles.weekHeaderLeft}>
          <Text style={styles.weekTitle}>Week {week.weekNumber}</Text>
          <Text style={styles.weekPhase}>{week.phase}</Text>
        </View>
        {week.isCurrentWeek && (
          <Text style={styles.weekDays}>
            {week.completedDays}/{week.totalDays} Days
          </Text>
        )}
      </View>

      {/* Timeline + Card */}
      <View style={styles.weekBody}>
        {/* Vertical dashed line */}
        <DashedTimeline isCurrentWeek={week.isCurrentWeek} />

        {/* Days card */}
        <View style={styles.daysCard}>
          {/* Row 1: 4 days */}
          <View style={styles.daysRow}>
            {row1.map((pill, i) => (
              <DayPillItem key={`${week.weekNumber}-r1-${i}`} pill={pill} />
            ))}
          </View>

          {/* Row 2: remaining days + week badge */}
          <View style={styles.daysRow2}>
            {row2.map((pill, i) => (
              <DayPillItem key={`${week.weekNumber}-r2-${i}`} pill={pill} />
            ))}
            <WeekBadge weekNumber={week.weekNumber} />
          </View>
        </View>
      </View>

      {/* Info notes */}
      {week.weekNumber === 1 && (
        <View style={styles.infoRow}>
          <InfoCircle width={18} height={18} />
          <Text style={styles.infoText}>
            The initial days will be adjusted in the 4th week
          </Text>
        </View>
      )}
      {week.weekNumber === 4 && (
        <View style={styles.infoRow}>
          <InfoCircle width={18} height={18} />
          <Text style={styles.infoText}>
            Initial Days of Week 1 are adjusted here.
          </Text>
        </View>
      )}
    </View>
  );
};

// --- Main Screen ---

const WorkoutPlanScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 120, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan progress bar */}
        <View style={styles.progressBarSection}>
          <PlanProgressBar />
        </View>

        {/* Week sections */}
        {WEEKS.map((week) => (
          <WeekSection key={week.weekNumber} week={week} />
        ))}
      </ScrollView>
    </View>
  );
};

export default WorkoutPlanScreen;

// --- Styles ---

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

  // Week section
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

  // Timeline + Card body
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

  // Days rows
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  daysRow2: {
    flexDirection: "row",
    gap: 32,
    alignItems: "center",
  },

  // Day pill
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
    color: "#FFFFFF",
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

  // Week badge
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
    color: "#FFFFFF",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.56,
    lineHeight: 14,
  },

  // Info row
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
});
