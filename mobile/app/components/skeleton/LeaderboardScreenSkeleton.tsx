import Skeleton from "@/app/components/skeleton/Skeleton";
import { StyleSheet, View } from "react-native";

const ROW_COUNT = 6;

/**
 * Skeleton placeholder for LeaderboardScreen. Mirrors the live layout:
 *   Podium row    (3 avatar columns, 2nd shorter, 3rd shortest)
 *   Dark sheet    (handle bar + N stacked row placeholders)
 *
 * Used while the initial leaderboard page is loading. Background colors and
 * border radii match Figma 4769:71418 so the swap to real data is seamless.
 */
const LeaderboardScreenSkeleton = () => (
  <View style={styles.root}>
    {/* Podium */}
    <View style={styles.podiumRow}>
      <PodiumSkeletonColumn blockHeight={149} />
      <PodiumSkeletonColumn blockHeight={200} isFirst />
      <PodiumSkeletonColumn blockHeight={115} />
    </View>

    {/* Dark sheet */}
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.sheetInner}>
        {Array.from({ length: ROW_COUNT }).map((_, i) => (
          <LeaderboardRowSkeleton key={i} />
        ))}
      </View>
    </View>
  </View>
);

const PodiumSkeletonColumn = ({
  blockHeight,
  isFirst,
}: {
  blockHeight: number;
  isFirst?: boolean;
}) => (
  <View style={[styles.podiumCol, isFirst && { flex: 1 }]}>
    <View style={styles.podiumPersonWrap}>
      <Skeleton width={80} height={80} radius={40} />
      <Skeleton width={60} height={18} radius={6} />
      <Skeleton width={48} height={12} radius={6} />
    </View>
    <View style={styles.podiumBlock}>
      <View style={[styles.podiumCap, { opacity: 0.4 }]} />
      <Skeleton
        width="100%"
        height={blockHeight}
        radius={0}
        style={styles.podiumStem}
      />
    </View>
  </View>
);

/**
 * Single-row skeleton. Exposed so the screen can drop one in the
 * load-more footer slot while paginating.
 */
export const LeaderboardRowSkeleton = () => (
  <View style={styles.rowWrap}>
    <View style={styles.row}>
      <Skeleton width={24} height={18} radius={6} />
      <Skeleton width={52} height={52} radius={26} />
      <View style={styles.rowText}>
        <Skeleton width={120} height={18} radius={6} />
      </View>
      <Skeleton width={60} height={14} radius={6} />
    </View>
  </View>
);

export default LeaderboardScreenSkeleton;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 36,
  },
  podiumCol: {
    alignItems: "center",
    gap: 16,
    width: 115,
  },
  podiumPersonWrap: {
    alignItems: "center",
    gap: 6,
  },
  podiumBlock: {
    width: "100%",
    alignItems: "center",
  },
  podiumCap: {
    width: "100%",
    height: 35,
    backgroundColor: "rgba(201, 168, 76, 0.4)",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  podiumStem: {
    backgroundColor: "rgba(201, 168, 76, 0.25)",
  },
  sheet: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    alignSelf: "center",
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 28,
  },
  sheetInner: {
    gap: 16,
  },
  rowWrap: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
  },
});
