import Skeleton from "@/app/components/skeleton/Skeleton";
import { StyleSheet, View } from "react-native";

const CARD_COUNT = 5;
const DAY_PILL_COUNT = 7;

/**
 * Skeleton placeholder for WeightsScreen — mirrors the live layout 1:1 so
 * the swap from skeleton → real content doesn't shift anything.
 *
 * Layout it shadows:
 *   ScreenHeader (title + eyebrow + avatar)
 *   PhaseWeekHeader (phase title + week chevrons + 7 day pills)
 *   DayHeader (day title + subtitle + exercise count)
 *   List of ExerciseSummaryCards
 */
const WeightsScreenSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* ── ScreenHeader ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Skeleton width={180} height={40} radius={8} />
          <Skeleton width={140} height={12} radius={6} style={styles.headerEyebrow} />
        </View>
        <Skeleton width={48} height={48} radius={24} />
      </View>

      {/* ── PhaseWeekHeader ── */}
      <View style={styles.phaseWeek}>
        <View style={styles.phaseWeekTop}>
          <Skeleton width={140} height={20} radius={6} />
          <View style={styles.weekNav}>
            <Skeleton width={32} height={32} radius={16} />
            <Skeleton width={48} height={28} radius={8} />
            <Skeleton width={32} height={32} radius={16} />
          </View>
        </View>
        <View style={styles.dayRow}>
          {Array.from({ length: DAY_PILL_COUNT }).map((_, i) => (
            <Skeleton key={i} width={40} height={56} radius={28} />
          ))}
        </View>
      </View>

      {/* ── DayHeader ── */}
      <View style={styles.dayHeader}>
        <View style={styles.dayHeaderLeft}>
          <Skeleton width={120} height={24} radius={6} />
          <Skeleton width={100} height={12} radius={6} style={styles.dayHeaderSubtitle} />
        </View>
        <Skeleton width={90} height={12} radius={6} />
      </View>

      {/* ── Exercise card list ── */}
      <View style={styles.cardList}>
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <ExerciseCardSkeleton key={i} />
        ))}
      </View>
    </View>
  );
};

const ExerciseCardSkeleton = () => (
  <View style={styles.card}>
    <View style={styles.cardLeft}>
      <Skeleton width={110} height={12} radius={6} />
      <Skeleton width={170} height={22} radius={6} />
      <Skeleton width={120} height={12} radius={6} />
    </View>
    <View style={styles.cardRight}>
      <Skeleton width={16} height={16} radius={4} />
      <Skeleton width={70} height={24} radius={6} />
      <Skeleton width={50} height={12} radius={6} />
    </View>
  </View>
);

/**
 * Card-list-only skeleton. Used when the screen's header chrome is already
 * rendered (Redux ready) but the per-exercise Supabase fetch hasn't returned
 * yet — covers the in-between window where the card area would otherwise
 * be a blank gap.
 */
export const WeightsCardsSkeleton = ({ count = CARD_COUNT }: { count?: number }) => (
  <View style={styles.cardList}>
    {Array.from({ length: count }).map((_, i) => (
      <ExerciseCardSkeleton key={i} />
    ))}
  </View>
);

export default WeightsScreenSkeleton;

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },

  // ScreenHeader
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 70,
  },
  headerLeft: {
    flex: 1,
  },
  headerEyebrow: {
    marginTop: 12,
  },

  // PhaseWeekHeader
  phaseWeek: {
    gap: 24,
  },
  phaseWeekTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // DayHeader
  dayHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayHeaderSubtitle: {
    marginTop: 8,
  },

  // Card list
  cardList: {
    gap: 12,
  },
  card: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 92,
  },
  cardLeft: {
    flex: 1,
    gap: 8,
    alignItems: "flex-start",
  },
  cardRight: {
    alignItems: "flex-end",
    alignSelf: "stretch",
    justifyContent: "space-between",
    gap: 10,
  },
});
