import ScreenFades from "@/app/components/common/ScreenFades";
import SessionHistoryCard from "@/app/components/workout/SessionHistoryCard";
import WeightProgressChart, { type ChartPoint } from "@/app/components/workout/WeightProgressChart";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { useHeaderHeight } from "@react-navigation/elements";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

interface SessionEntry {
  id: string;
  dateLabel: string;
  weightKg: number;
  reps: number;
  delta?: { kg: number; positive: boolean };
  badge?: boolean;
}

interface WeekSection {
  id: string;
  weekLabel: string;
  monthLabel: string;
  entries: SessionEntry[];
}

const POSITIVE = "#3DCA7A";

const STATS = {
  current: 82.4,
  heaviest: 140,
  lightest: 80,
  successMessage: "Great Job! Consistency is the key. You're mastering it.",
};

// 12-week progression — chart pages through these 4 weeks at a time
// (W1-W4, W5-W8, W9-W12) so the user can swipe through the full program.
const CHART_DATA: ChartPoint[] = [
  { label: "W1", value: 85.5 },
  { label: "W2", value: 85.5 },
  { label: "W3", value: 86 },
  { label: "W4", value: 88 },
  { label: "W5", value: 90 },
  { label: "W6", value: 92 },
  { label: "W7", value: 94 },
  { label: "W8", value: 95.5 },
  { label: "W9", value: 96.5 },
  { label: "W10", value: 97.5 },
  { label: "W11", value: 98.5 },
  { label: "W12", value: 99 },
];

const WEEK_SECTIONS: WeekSection[] = [
  {
    id: "w4",
    weekLabel: "Week 4",
    monthLabel: "March 24",
    entries: [
      { id: "w4-1", dateLabel: "Week 4 • Apr 20", weightKg: 140, reps: 4, delta: { kg: 20, positive: true } },
      { id: "w4-2", dateLabel: "Week 4 • Apr 04", weightKg: 120, reps: 4, delta: { kg: 25, positive: false } },
      { id: "w4-3", dateLabel: "Week 4 • Apr 20", weightKg: 145, reps: 4, badge: true },
    ],
  },
  {
    id: "w3",
    weekLabel: "Week 3",
    monthLabel: "March 16",
    entries: [
      { id: "w3-1", dateLabel: "Week 4 • Apr 20", weightKg: 115, reps: 4, delta: { kg: 15, positive: true } },
      { id: "w3-2", dateLabel: "Week 4 • Apr 04", weightKg: 100, reps: 4, delta: { kg: 10, positive: true } },
      { id: "w3-3", dateLabel: "Week 4 • Apr 20", weightKg: 90, reps: 4, delta: { kg: 10, positive: false } },
    ],
  },
  {
    id: "w2",
    weekLabel: "Week 2",
    monthLabel: "March 10",
    entries: [
      { id: "w2-1", dateLabel: "Week 4 • Apr 20", weightKg: 100, reps: 4 },
      { id: "w2-2", dateLabel: "Week 4 • Apr 04", weightKg: 100, reps: 4, delta: { kg: 10, positive: true } },
      { id: "w2-3", dateLabel: "Week 4 • Apr 20", weightKg: 90, reps: 4, delta: { kg: 10, positive: true } },
    ],
  },
  {
    id: "w1",
    weekLabel: "Week 1",
    monthLabel: "March 04",
    entries: [
      { id: "w1-1", dateLabel: "Week 4 • Apr 20", weightKg: 80, reps: 4, delta: { kg: 5, positive: false } },
      { id: "w1-2", dateLabel: "Week 4 • Apr 04", weightKg: 85, reps: 4, delta: { kg: 5, positive: true } },
      { id: "w1-3", dateLabel: "Week 4 • Apr 20", weightKg: 80, reps: 4 },
    ],
  },
];

const StatsCard = () => (
  <View style={styles.statsCard}>
    <View style={styles.statsTopRow}>
      <View style={styles.statsCurrent}>
        <Text style={styles.statsLabel}>Current</Text>
        <Text style={styles.statsValue}>{`${STATS.current} kg`}</Text>
      </View>
      <View style={styles.statsSecondary}>
        <View style={styles.statsSecondaryRow}>
          <Text style={styles.statsLabel}>Heaviest</Text>
          <Text style={styles.statsSecondaryValue}>{`${STATS.heaviest} kg`}</Text>
        </View>
        <View style={styles.statsSecondaryRow}>
          <Text style={styles.statsLabel}>Lightest</Text>
          <Text style={styles.statsSecondaryValue}>{`${STATS.lightest} kg`}</Text>
        </View>
      </View>
    </View>

    <WeightProgressChart data={CHART_DATA} yMin={80} yMax={100} yStep={5} />

    <View style={styles.successBanner}>
      <Text style={styles.successText}>{STATS.successMessage}</Text>
    </View>
  </View>
);

// Vertical dashed timeline matching Figma: white @ 24% opacity, 2px stroke, 8/8 dasharray.
const DashedTimeline = () => (
  <Svg width={2} height="100%" style={styles.weekTimeline}>
    <Path
      d="M 1 0 L 1 10000"
      stroke="white"
      strokeOpacity={0.24}
      strokeWidth={2}
      strokeDasharray="8 8"
    />
  </Svg>
);

const WeekBlock = ({ section, isLast }: { section: WeekSection; isLast: boolean }) => (
  <View style={styles.weekBlock}>
    <View style={styles.weekHeader}>
      <Text style={styles.weekTitle}>{section.weekLabel}</Text>
      <Text style={styles.weekMonth}>{section.monthLabel}</Text>
    </View>
    <View style={styles.weekEntries}>
      {/* Skip the connector on the oldest week — nothing comes after it. */}
      {!isLast ? <DashedTimeline /> : null}
      <View style={styles.weekEntryList}>
        {section.entries.map((e) => (
          <SessionHistoryCard
            key={e.id}
            dateLabel={e.dateLabel}
            weightKg={e.weightKg}
            reps={e.reps}
            delta={e.delta}
            badge={e.badge}
          />
        ))}
      </View>
    </View>
  </View>
);

const ExerciseHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const totalEntries = WEEK_SECTIONS.reduce((sum, s) => sum + s.entries.length, 0);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 100 },
        ]}
      >
        <StatsCard />

        <View style={styles.historyHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyEyebrow}>Deadlift</Text>
            <Text style={styles.historyTitle}>Session History</Text>
          </View>
          <Text style={styles.historyCount}>{`${totalEntries} Sessions`}</Text>
        </View>

        <View style={styles.weekList}>
          {WEEK_SECTIONS.map((section, idx) => (
            <WeekBlock
              key={section.id}
              section={section}
              isLast={idx === WEEK_SECTIONS.length - 1}
            />
          ))}
        </View>
      </ScrollView>

      <ScreenFades hideTop bottomExtra={80} />
    </View>
  );
};

export default ExerciseHistoryScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 24,
  },

  // Stats card
  statsCard: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 12,
    gap: 24,
    alignItems: "center",
  },
  statsTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
  },
  statsCurrent: {
    flex: 1,
    gap: 8,
  },
  statsSecondary: {
    flex: 1,
    gap: 8,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  statsSecondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  statsValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    lineHeight: 28.8,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statsSecondaryValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    lineHeight: 19.2,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Success banner
  successBanner: {
    backgroundColor: "rgba(61,202,122,0.08)",
    borderWidth: 1,
    borderColor: "rgba(61,202,122,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: "100%",
  },
  successText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: POSITIVE,
  },

  // History header
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  historyEyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  historyTitle: {
    marginTop: 6,
    fontFamily: FONTS.display,
    fontSize: 24,
    lineHeight: 28.8,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  historyCount: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.8)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },

  // Week sections
  weekList: {
    gap: 24,
  },
  weekBlock: {
    gap: 24,
  },
  weekHeader: {
    gap: 6,
  },
  weekTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  weekMonth: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  weekEntries: {
    position: "relative",
    paddingLeft: 25,
  },
  weekTimeline: {
    position: "absolute",
    left: 9,
    top: 0,
    bottom: 0,
  },
  weekEntryList: {
    gap: 16,
  },

});
