import Skeleton from "@/app/components/skeleton/Skeleton";
import { COLORS } from "@/app/constants/colors";
import { StyleSheet, View } from "react-native";

const SECTIONS = [
  { title: 100, rows: 5 },
  { title: 80, rows: 3 },
];

interface ExerciseListScreenSkeletonProps {
  /**
   * When true, each exercise row renders a faint reorder-handle placeholder
   * (4 dashes on the left). The real screen only shows this in active /
   * Start mode — passing `dayStatus === "active"` from the caller keeps the
   * skeleton consistent with the View-button completed flow.
   */
  showHandle?: boolean;
}

/**
 * Skeleton placeholder for ExerciseListScreen. Mirrors the live layout:
 *   Stats row   (2 stat cards)
 *   Section ×N  (header line + title + line, then rows of exercise + divider)
 *   Bottom CTA  (Start Now button)
 *
 * Keeps the same gaps + card chrome so the swap to real data doesn't shift.
 */
const ExerciseListScreenSkeleton = ({ showHandle }: ExerciseListScreenSkeletonProps) => (
  <View style={styles.container}>
    {/* Stats row — 2 cards side by side */}
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Skeleton width={40} height={22} radius={6} />
        <Skeleton width={70} height={12} radius={6} />
      </View>
      <View style={styles.statCard}>
        <Skeleton width={40} height={22} radius={6} />
        <Skeleton width={70} height={12} radius={6} />
      </View>
    </View>

    <ExerciseSectionsSkeleton showHandle={showHandle} />

    {showHandle ? (
      /* Bottom CTA — same height as PrimaryButton (56). Only the active
         flow has the Start Now button below the list. */
      <Skeleton width="100%" height={56} radius={28} style={styles.cta} />
    ) : null}
  </View>
);

/**
 * Sections-only variant. Use when the stats row / banners are already
 * rendered (e.g. tapping "View" on a completed day — the page is half-
 * loaded but the session content is still being fetched).
 *
 * `showHandle` defaults to false: the View flow never shows the reorder
 * handle, so the skeleton omits it too.
 */
export const ExerciseSectionsSkeleton = ({
  showHandle = false,
}: {
  showHandle?: boolean;
}) => (
  <View style={styles.sectionsGroup}>
    {SECTIONS.map((s, i) => (
      <View key={i} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Skeleton width={s.title} height={18} radius={6} />
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.exerciseList}>
          {Array.from({ length: s.rows }).map((_, idx) => (
            <View key={idx}>
              <ExerciseRowSkeleton showHandle={showHandle} />
              {idx < s.rows - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      </View>
    ))}
  </View>
);

const ExerciseRowSkeleton = ({ showHandle }: { showHandle?: boolean }) => (
  <View style={styles.exerciseRow}>
    {showHandle ? (
      <View style={styles.reorderIcon}>
        <View style={styles.reorderLine} />
        <View style={styles.reorderLine} />
        <View style={styles.reorderLine} />
        <View style={styles.reorderLine} />
      </View>
    ) : null}
    <View style={styles.exerciseCopy}>
      <Skeleton width={160} height={20} radius={6} />
      <Skeleton width={110} height={12} radius={6} />
    </View>
    <View style={styles.weightBlock}>
      <Skeleton width={70} height={12} radius={6} />
      <Skeleton width={50} height={20} radius={6} />
    </View>
  </View>
);

export default ExerciseListScreenSkeleton;

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  sectionsGroup: {
    gap: 24,
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minHeight: 49,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.neutral.black3,
  },

  // Section
  section: {
    gap: 18,
  },
  sectionHeader: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.neutral.charcoal,
  },

  // Exercise rows
  exerciseList: {
    width: "100%",
    gap: 12,
  },
  exerciseRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reorderIcon: {
    width: 24,
    height: 24,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 3,
  },
  reorderLine: {
    width: 12,
    height: 1.4,
    borderRadius: 1,
    backgroundColor: "rgba(240,240,240,0.18)",
  },
  exerciseCopy: {
    flex: 1,
    gap: 8,
    paddingVertical: 12,
  },
  weightBlock: {
    alignItems: "flex-end",
    gap: 8,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.neutral.charcoal,
  },

  // Bottom CTA
  cta: {
    marginTop: 16,
  },
});
