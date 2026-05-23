import Skeleton from "@/app/components/skeleton/Skeleton";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const WEEK_SECTIONS = 2;
const ENTRIES_PER_WEEK = 3;
const Y_TICK_COUNT = 5;

/**
 * Skeleton for ExerciseHistoryScreen. Mirrors the live composition:
 *   StatsCard
 *     - top row: Current + Heaviest/Lightest
 *     - chart shell (y-axis ticks + faint plot area)
 *     - success banner
 *   History header (eyebrow + title + count)
 *   Week sections, each with a dashed timeline + N session cards
 */
const ExerciseHistoryScreenSkeleton = () => {
  return (
    <View style={styles.container}>
      <StatsCardSkeleton />

      <View style={styles.historyHeader}>
        <View style={styles.historyHeaderLeft}>
          <Skeleton width={120} height={12} radius={6} />
          <Skeleton width={200} height={28} radius={6} style={styles.historyTitleSpacer} />
        </View>
        <Skeleton width={90} height={12} radius={6} />
      </View>

      <View style={styles.weekList}>
        {Array.from({ length: WEEK_SECTIONS }).map((_, i) => (
          <WeekBlockSkeleton key={i} isLast={i === WEEK_SECTIONS - 1} />
        ))}
      </View>
    </View>
  );
};

const StatsCardSkeleton = () => (
  <View style={styles.statsCard}>
    <View style={styles.statsTopRow}>
      <View style={styles.statsCurrent}>
        <Skeleton width={70} height={12} radius={6} />
        <Skeleton width={110} height={28} radius={6} />
      </View>
      <View style={styles.statsSecondary}>
        <View style={styles.statsSecondaryRow}>
          <Skeleton width={70} height={12} radius={6} />
          <Skeleton width={60} height={18} radius={6} />
        </View>
        <View style={styles.statsSecondaryRow}>
          <Skeleton width={70} height={12} radius={6} />
          <Skeleton width={60} height={18} radius={6} />
        </View>
      </View>
    </View>

    {/* Chart shell: y-axis tick column + plot area with horizontal grid */}
    <View style={styles.chartShell}>
      <View style={styles.chartYAxis}>
        {Array.from({ length: Y_TICK_COUNT }).map((_, i) => (
          <Skeleton key={i} width={22} height={10} radius={4} />
        ))}
      </View>
      <View style={styles.chartPlot}>
        {Array.from({ length: Y_TICK_COUNT }).map((_, i) => (
          <DashedGridLine key={i} />
        ))}
      </View>
    </View>

    {/* Success banner */}
    <Skeleton width="100%" height={28} radius={8} style={styles.banner} />
  </View>
);

const DashedGridLine = () => (
  <Svg height={1} width="100%" style={styles.gridLine}>
    <Path
      d="M 0 0.5 L 1000 0.5"
      stroke="rgba(240,240,240,0.10)"
      strokeWidth={1}
      strokeDasharray="4 4"
    />
  </Svg>
);

const WeekBlockSkeleton = ({ isLast }: { isLast: boolean }) => (
  <View style={styles.weekBlock}>
    <View style={styles.weekHeader}>
      <Skeleton width={90} height={20} radius={6} />
      <Skeleton width={70} height={12} radius={6} style={styles.weekMonthSpacer} />
    </View>
    <View style={styles.weekEntries}>
      {!isLast ? <TimelineDashed /> : null}
      <View style={styles.weekEntryList}>
        {Array.from({ length: ENTRIES_PER_WEEK }).map((_, i) => (
          <SessionCardSkeleton key={i} />
        ))}
      </View>
    </View>
  </View>
);

const TimelineDashed = () => (
  <Svg width={2} height="100%" style={styles.timeline}>
    <Path
      d="M 1 0 L 1 10000"
      stroke="white"
      strokeOpacity={0.18}
      strokeWidth={2}
      strokeDasharray="8 8"
    />
  </Svg>
);

const SessionCardSkeleton = () => (
  <View style={styles.sessionCard}>
    <View style={styles.sessionCardLeft}>
      <Skeleton width={120} height={12} radius={6} />
      <Skeleton width={180} height={24} radius={6} />
    </View>
    <Skeleton width={50} height={14} radius={6} />
  </View>
);

export default ExerciseHistoryScreenSkeleton;

const styles = StyleSheet.create({
  container: {
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

  // Chart shell
  chartShell: {
    width: "100%",
    height: 180,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  chartYAxis: {
    width: 30,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  chartPlot: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  gridLine: {
    width: "100%",
  },
  banner: {
    marginTop: 0,
  },

  // History header
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  historyHeaderLeft: {
    flex: 1,
  },
  historyTitleSpacer: {
    marginTop: 8,
  },

  // Week list
  weekList: {
    gap: 24,
  },
  weekBlock: {
    gap: 24,
  },
  weekHeader: {
    gap: 6,
  },
  weekMonthSpacer: {
    marginTop: 4,
  },
  weekEntries: {
    position: "relative",
    paddingLeft: 25,
  },
  weekEntryList: {
    gap: 16,
  },
  timeline: {
    position: "absolute",
    left: 9,
    top: 0,
    bottom: 0,
  },

  // Session card (mirrors SessionHistoryCard)
  sessionCard: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    minHeight: 83,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  sessionCardLeft: {
    flex: 1,
    gap: 8,
  },
});
