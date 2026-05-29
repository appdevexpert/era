import ScreenFades from "@/app/components/common/ScreenFades";
import LeaderboardScreenSkeleton, {
  LeaderboardRowSkeleton,
} from "@/app/components/skeleton/LeaderboardScreenSkeleton";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import {
  fetchLeaderboardPage,
  fetchMyLeaderboardRank,
  type LeaderboardEntry,
} from "@/app/services/leaderboardService";
import type { RootState } from "@/app/stores/store";
import {
  MedalBronze,
  MedalGold,
  MedalSilver,
  ProfileBackChevron,
} from "@/assets/icons";
import { DemoMedia } from "@/assets/images";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const PAGE_SIZE = 10;

type Status = "idle" | "loading" | "success" | "error";

const Avatar = ({
  size,
  border,
  borderWidth = 1,
  uri,
}: {
  size: number;
  border: string;
  borderWidth?: number;
  uri?: string | null;
}) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth,
      borderColor: border,
      backgroundColor: "rgba(201, 168, 76, 0.12)",
      overflow: "hidden",
    }}
  >
    <Image
      source={uri ? { uri } : DemoMedia}
      style={{ width: "100%", height: "100%" }}
      resizeMode="cover"
    />
  </View>
);

const PODIUM_GRADIENT = ["#FCF3C0", "#F7E06F", "#C9A84C"] as const;

const PODIUM_BORDER: Record<1 | 2 | 3, string> = {
  1: COLORS.primary.dark,
  2: COLORS.neutral.white,
  3: COLORS.semantic.danger,
};

const PODIUM_PTS_COLOR: Record<1 | 2 | 3, string> = {
  1: COLORS.primary.dark,
  2: "rgba(255,255,255,0.6)",
  3: "#DB6F6F",
};

const PODIUM_BLOCK: Record<
  1 | 2 | 3,
  { height: number; numberSize: number; numberTop: number; opacity?: number }
> = {
  1: { height: 200, numberSize: 100, numberTop: 75 },
  2: { height: 149, numberSize: 80, numberTop: 60, opacity: 0.9 },
  3: { height: 115, numberSize: 70, numberTop: 45, opacity: 0.8 },
};

const PodiumColumn = ({
  entry,
  rank,
  isFirst = false,
  fallbackName,
}: {
  entry?: LeaderboardEntry;
  rank: 1 | 2 | 3;
  isFirst?: boolean;
  fallbackName: string;
}) => {
  const block = PODIUM_BLOCK[rank];
  return (
    <View style={[styles.podiumCol, isFirst && { flex: 1 }]}>
      <View style={styles.podiumPersonWrap}>
        <Avatar
          size={80}
          border={PODIUM_BORDER[rank]}
          borderWidth={rank === 1 ? 1.333 : 1}
          uri={entry?.avatarUrl}
        />
        <Text style={styles.podiumName} numberOfLines={1}>
          {entry?.displayName ?? fallbackName}
        </Text>
        <Text style={[styles.podiumPts, { color: PODIUM_PTS_COLOR[rank] }]}>
          {entry?.totalPoints ?? 0} pts
        </Text>
        <View style={styles.awardBadge}>
          {rank === 1 ? (
            <MedalGold width={29} height={40} />
          ) : rank === 2 ? (
            <MedalSilver width={29} height={40} />
          ) : (
            <MedalBronze width={29} height={40} />
          )}
        </View>
      </View>
      <View
        style={[
          styles.podiumBlock,
          { opacity: block.opacity ?? 1 },
          isFirst && { width: "100%" },
        ]}
      >
        <View style={styles.podiumCap} />
        <LinearGradient
          colors={PODIUM_GRADIENT}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={[styles.podiumStem, { height: block.height }]}
        />
        <Text
          style={[
            styles.podiumNumber,
            { fontSize: block.numberSize, top: block.numberTop },
          ]}
        >
          {rank}
        </Text>
      </View>
    </View>
  );
};

const RankRow = ({
  entry,
  isYou,
  youLabel,
}: {
  entry: LeaderboardEntry;
  isYou: boolean;
  youLabel: string;
}) => {
  if (isYou) {
    return (
      <View style={styles.rowYou}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(201, 168, 76, 0.3)", "rgba(17, 17, 17, 0)"]}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.rankWrap}>
          <Text style={styles.rankText}>#{entry.rank}</Text>
        </View>
        <Avatar
          size={52}
          border={COLORS.primary.light}
          borderWidth={0.867}
          uri={entry.avatarUrl}
        />
        <Text
          style={[styles.rowName, { color: COLORS.primary.base }]}
          numberOfLines={1}
        >
          {entry.displayName ?? youLabel}
        </Text>
        <Text style={[styles.rowPts, { color: COLORS.primary.dark }]}>
          {entry.totalPoints} pts
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <View style={styles.rankWrap}>
        <Text style={styles.rankText}>#{entry.rank}</Text>
      </View>
      <Avatar size={52} border="transparent" borderWidth={0} uri={entry.avatarUrl} />
      <Text style={styles.rowName} numberOfLines={1}>
        {entry.displayName ?? "—"}
      </Text>
      <Text style={styles.rowPts}>{entry.totalPoints} pts</Text>
    </View>
  );
};

const LeaderboardScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const currentUserId = useSelector((s: RootState) => s.auth.user?.id ?? null);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [myRank, setMyRank] = useState<number>(0);

  // Guard against RN's habit of double-firing onEndReached on the same offset.
  const isFetchingRef = useRef(false);

  const loadPage = useCallback(
    async (offset: number, mode: "initial" | "more") => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        if (mode === "more") setLoadingMore(true);
        else setStatus("loading");

        const page = await fetchLeaderboardPage(PAGE_SIZE, offset);

        setEntries((prev) => (mode === "more" ? [...prev, ...page] : page));
        setHasMore(page.length === PAGE_SIZE);
        setStatus("success");
      } catch (e) {
        console.warn("[leaderboard] page fetch failed", e);
        if (mode === "initial") setStatus("error");
      } finally {
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    loadPage(0, "initial");
    fetchMyLeaderboardRank()
      .then((r) => setMyRank(r.rank))
      .catch(() => {});
  }, [loadPage]);

  const onEndReached = useCallback(() => {
    if (!hasMore || isFetchingRef.current || status !== "success") return;
    loadPage(entries.length, "more");
  }, [entries.length, hasMore, loadPage, status]);

  // Podium highlights the top 3 (Figma 4769:71418). List shows ranks 4+
  // by default, falling back to all entries when there are fewer than 4 users
  // so the sheet never renders empty in early-adopter state.
  const podiumEntries = entries.slice(0, 3);
  const listEntries = entries.length >= 4 ? entries.slice(3) : entries;

  // Each row sits inside the dark sheet — we wrap it with the sheet bg so the
  // 20px horizontal gutter on either side of the row stays #121212.
  const renderItem: ListRenderItem<LeaderboardEntry> = useCallback(
    ({ item }) => (
      <View style={styles.sheetRowWrap}>
        <RankRow
          entry={item}
          isYou={item.userId === currentUserId}
          youLabel={t("progress.leaderboardYou")}
        />
      </View>
    ),
    [currentUserId, t],
  );

  // Empty / error states live inside the dark sheet so the chrome doesn't
  // disappear when there's no data. Initial loading is handled separately
  // via the full-screen skeleton below.
  const ListEmpty =
    status === "error" ? (
      <View style={[styles.sheetFill, styles.centered]}>
        <Text style={styles.emptyText}>{t("progress.leaderboardError")}</Text>
      </View>
    ) : (
      <View style={[styles.sheetFill, styles.centered]}>
        <Text style={styles.emptyText}>{t("progress.leaderboardEmpty")}</Text>
      </View>
    );

  const ListFooter = (
    <View
      style={[
        styles.sheetFooter,
        { paddingBottom: insets.bottom + 40 },
      ]}
    >
      {loadingMore ? (
        <>
          <LeaderboardRowSkeleton />
          <View style={{ height: 16 }} />
          <LeaderboardRowSkeleton />
        </>
      ) : null}
    </View>
  );

  // BottomSheet snap points — first snap shows the podium + a peek of the
  // sheet (handle + a couple rows), second snap covers the podium so the
  // list owns the full screen. Reanimated drives the spring under the hood.
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["35%", "70%"], []);

  // Initial load — show the full skeleton (podium + sheet + rows) instead of
  // a spinner. Once we have any data (even a stale page from refresh), switch
  // to the live sheet.
  const showInitialSkeleton = status === "loading" && entries.length === 0;

  return (
    <View style={styles.root}>
      {/* Podium sits behind the sheet — visible at the first snap point,
          covered when the user drags the sheet up to the second snap. */}
      <View
        style={[styles.podiumWrap, { paddingTop: insets.top + 110 }]}
        pointerEvents="box-none"
      >
        <View style={styles.podiumRow}>
          <PodiumColumn entry={podiumEntries[1]} rank={2} fallbackName="—" />
          <PodiumColumn entry={podiumEntries[0]} rank={1} isFirst fallbackName="—" />
          <PodiumColumn entry={podiumEntries[2]} rank={3} fallbackName="—" />
        </View>
      </View>

      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
        handleStyle={styles.sheetHandleArea}
      >
        {showInitialSkeleton ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <LeaderboardScreenSkeleton />
          </ScrollView>
        ) : (
          <BottomSheetFlatList
            data={listEntries}
            keyExtractor={(item) => item.userId}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={entries.length === 0 ? ListEmpty : null}
            ListFooterComponent={ListFooter}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ItemSeparatorComponent={() => (
              <View style={styles.sheetSeparator} />
            )}
            contentContainerStyle={styles.sheetContent}
          />
        )}
      </BottomSheet>

      {/* Pinned header — same blur pattern as WorkoutPlanHeader */}
      <BlurView
        intensity={24}
        tint="dark"
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <PressableScale onPress={() => navigation.goBack()} hitSlop={12}>
          <ProfileBackChevron width={24} height={24} />
        </PressableScale>
        <View style={{ gap: 6 }}>
          <Text style={styles.eyebrow}>
            {myRank > 0 ? `#${myRank}` : t("progress.leaderboardUnranked")}
          </Text>
          <Text style={styles.title}>{t("progress.leaderboard")}</Text>
        </View>
      </BlurView>

      <ScreenFades />
    </View>
  );
};

export default LeaderboardScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },

  // Header — translucent blur over scrolling content
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(17, 17, 17, 0.6)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 33.6,
  },

  // Podium
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
    gap: 4,
    position: "relative",
  },
  podiumName: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.neutral.white,
    marginTop: 4,
    maxWidth: 110,
  },
  podiumPts: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: "600",
  },
  awardBadge: {
    position: "absolute",
    right: -6,
    top: "50%",
    marginTop: -20,
    width: 29,
    height: 40,
  },

  podiumBlock: {
    width: "100%",
    alignItems: "center",
    position: "relative",
  },
  podiumCap: {
    width: "100%",
    height: 35,
    backgroundColor: "rgba(201, 168, 76, 0.55)",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  podiumStem: {
    width: "100%",
  },
  podiumNumber: {
    position: "absolute",
    fontFamily: FONTS.medium,
    fontWeight: "500",
    color: COLORS.neutral.white,
    textAlign: "center",
  },

  // Podium container — sits behind the sheet, padded under the pinned header.
  podiumWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },

  // BottomSheet chrome (Figma 4769:71513). The sheet itself owns the rounded
  // top, drop shadow, and handle indicator — these styles feed into gorhom.
  sheetBg: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    // Drop shadow from Figma: 0 -10 12 rgba(0,0,0,0.4)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHandle: {
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  sheetHandleArea: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  sheetContent: {
    paddingTop: 0,
  },
  sheetRowWrap: {
    backgroundColor: "#121212",
    paddingHorizontal: 20,
  },
  sheetSeparator: {
    height: 16,
    backgroundColor: "#121212",
  },
  sheetFill: {
    backgroundColor: "#121212",
    minHeight: 240,
  },
  sheetFooter: {
    backgroundColor: "#121212",
    paddingVertical: 20,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // List rows (sit inside sheetRowWrap)
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  rowYou: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    overflow: "hidden",
  },
  rankWrap: {
    width: 36,
  },
  rankText: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    color: COLORS.primary.dark,
    letterSpacing: 0.72,
    textTransform: "uppercase",
  },
  rowName: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  rowPts: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: "rgba(240, 240, 240, 0.5)",
    letterSpacing: 0.64,
    textTransform: "uppercase",
  },

  // Empty / loading
  centered: {
    paddingHorizontal: 32,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "rgba(240, 240, 240, 0.6)",
    textAlign: "center",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
