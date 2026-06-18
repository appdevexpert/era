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
import { LaurelWreath, ProfileBackChevron } from "@/assets/icons";
import {
  TrophyBadgeBronze,
  TrophyBadgeGold,
  TrophyBadgeSilver,
} from "@/assets/images";
import Svg, { Path } from "react-native-svg";
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

const PAGE_SIZE = 10;

type Status = "idle" | "loading" | "success" | "error";

const getInitial = (name?: string | null) => {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
};

const Avatar = ({
  size,
  border,
  borderWidth = 1,
  uri,
  name,
}: {
  size: number;
  border: string;
  borderWidth?: number;
  uri?: string | null;
  name?: string | null;
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
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {uri ? (
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />
    ) : (
      <>
        <LinearGradient
          colors={[COLORS.primary.dark, COLORS.primary.base]}
          style={StyleSheet.absoluteFill}
        />
        <Text
          style={{
            fontFamily: FONTS.semiBold,
            fontWeight: "700",
            fontSize: size * 0.42,
            color: "#1A1A1A",
          }}
        >
          {getInitial(name)}
        </Text>
      </>
    )}
  </View>
);

/* ───── Podium (Figma 6611:4828) ─────
 *
 * Three blocks, gold/silver/bronze. Each block has a 3D top "cap" (trapezoid)
 * + a tall gradient body. A laurel wreath sits behind the ordinal text on the
 * body. Cap shapes differ per position — 1st has both edges sloped (viewed
 * head-on), 2nd has its left edge sloped (right-of-center perspective),
 * 3rd has its right edge sloped (left-of-center perspective).
 */

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

interface PodiumStyle {
  width: number;
  bodyHeight: number;
  bodyGradient: readonly [string, string];
  capColor: string;
  laurelColor: string;
  laurelWidth: number;
  laurelHeight: number;
  numberSize: number;
  ordinalSize: number;
  capPath: string;
  capWidth: number;
}

const PODIUM_STYLE: Record<1 | 2 | 3, PodiumStyle> = {
  1: {
    width: 140,
    bodyHeight: 204,
    bodyGradient: ["#C9A84C", "#5E4B15"],
    capColor: "#876B1D",
    laurelColor: "#E6C97A",
    laurelWidth: 116,
    laurelHeight: 95,
    numberSize: 40,
    ordinalSize: 22,
    capWidth: 140,
    capPath:
      "M14.101 3.35041C15.111 1.29921 17.198 0 19.484 0H121.298C123.632 0 125.754 1.35397 126.738 3.47083L140 32H0L14.101 3.35041Z",
  },
  2: {
    width: 115,
    bodyHeight: 163,
    bodyGradient: ["#979797", "#3F3F3F"],
    capColor: "#525252",
    laurelColor: "#9E9E9E",
    laurelWidth: 99,
    laurelHeight: 82,
    numberSize: 28,
    ordinalSize: 17,
    capWidth: 115,
    capPath:
      "M25.516 2.1048C26.656 0.7692 28.3238 0 30.0797 0H115V32H0L25.516 2.1048Z",
  },
  3: {
    width: 115,
    bodyHeight: 139,
    bodyGradient: ["rgba(173,88,30,0.8)", "rgba(89,43,12,0.8)"],
    capColor: "#43210B",
    laurelColor: "#9E5A38",
    laurelWidth: 91,
    laurelHeight: 75,
    numberSize: 24,
    ordinalSize: 14,
    capWidth: 115,
    capPath:
      "M0 0H86.928C88.769 0 90.508 0.8448 91.645 2.2919L115 32H0V0Z",
  },
};

const ORDINAL: Record<1 | 2 | 3, string> = { 1: "st", 2: "nd", 3: "rd" };

const PodiumCap = ({ rank }: { rank: 1 | 2 | 3 }) => {
  const s = PODIUM_STYLE[rank];
  return (
    <Svg width={s.capWidth} height={32} viewBox={`0 0 ${s.capWidth} 32`}>
      <Path d={s.capPath} fill={s.capColor} />
    </Svg>
  );
};

const PodiumColumn = ({
  entry,
  rank,
  fallbackName,
}: {
  entry?: LeaderboardEntry;
  rank: 1 | 2 | 3;
  fallbackName: string;
}) => {
  const s = PODIUM_STYLE[rank];
  return (
    <View style={[styles.podiumCol, { width: s.width }]}>
      <View style={styles.podiumPersonWrap}>
        <Avatar
          size={80}
          border={PODIUM_BORDER[rank]}
          borderWidth={rank === 1 ? 1.333 : 1}
          uri={entry?.avatarUrl}
          name={entry?.displayName ?? fallbackName}
        />
        <Text style={styles.podiumName} numberOfLines={1}>
          {entry?.displayName ?? fallbackName}
        </Text>
        <Text style={[styles.podiumPts, { color: PODIUM_PTS_COLOR[rank] }]}>
          {entry?.totalPoints ?? 0} pts
        </Text>
        <Image
          source={
            rank === 1
              ? TrophyBadgeGold
              : rank === 2
                ? TrophyBadgeSilver
                : TrophyBadgeBronze
          }
          style={styles.awardBadge}
          resizeMode="contain"
        />
      </View>

      {/* 3D top cap — trapezoid with sloped edges depending on position */}
      <PodiumCap rank={rank} />

      {/* Body — gradient block with laurel wreath behind the ordinal */}
      <LinearGradient
        colors={s.bodyGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.podiumBody, { height: s.bodyHeight, width: s.width }]}
      >
        <View
          style={[
            styles.podiumLaurelStack,
            { width: s.laurelWidth, height: s.laurelHeight },
          ]}
        >
          <LaurelWreath
            width={s.laurelWidth}
            height={s.laurelHeight}
            color={s.laurelColor}
          />
          <View style={styles.podiumOrdinalAbs} pointerEvents="none">
            <View style={styles.podiumOrdinalRow}>
              <Text
                style={[
                  styles.podiumOrdinalNumber,
                  { fontSize: s.numberSize, lineHeight: s.numberSize },
                ]}
              >
                {rank}
              </Text>
              <Text
                style={[
                  styles.podiumOrdinalSuffix,
                  { fontSize: s.ordinalSize, lineHeight: s.ordinalSize },
                ]}
              >
                {ORDINAL[rank]}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const RankRow = ({
  entry,
  isTop,
}: {
  entry: LeaderboardEntry;
  isTop: boolean;
}) => {
  if (isTop) {
    return (
      <View style={styles.rowTop}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(201, 168, 76, 0.3)", "rgba(17, 17, 17, 0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
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
          name={entry.displayName}
        />
        <Text
          style={[styles.rowName, { color: COLORS.primary.base }]}
          numberOfLines={1}
        >
          {entry.displayName ?? "—"}
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
      <Avatar
        size={52}
        border="transparent"
        borderWidth={0}
        uri={entry.avatarUrl}
        name={entry.displayName}
      />
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

  // Podium highlights the top 3 (Figma 4769:71418). Sheet shows the full
  // ranked list — including the top 3 — so the entire leaderboard is
  // scrollable inside the sheet.
  const podiumEntries = entries.slice(0, 3);
  const listEntries = entries;

  // Each row sits inside the dark sheet — we wrap it with the sheet bg so the
  // 20px horizontal gutter on either side of the row stays #121212.
  const renderItem: ListRenderItem<LeaderboardEntry> = useCallback(
    ({ item }) => (
      <View style={styles.sheetRowWrap}>
        <RankRow entry={item} isTop={item.rank === 1} />
      </View>
    ),
    [],
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
  // list owns the full screen. Scrolling at the lower snap pulls the sheet
  // up to the higher snap first, then the list scrolls.
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
          <PodiumColumn entry={podiumEntries[0]} rank={1} fallbackName="—" />
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

  // Podium — Figma 6611:4828
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 36,
  },
  podiumCol: {
    alignItems: "center",
  },
  podiumPersonWrap: {
    alignItems: "center",
    gap: 4,
    position: "relative",
    marginBottom: 16,
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
    right: -8,
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
  },
  // Body sits flush against the cap. Laurel + ordinal share the same wrapper
  // so the rank text sits in the empty middle of the wreath.
  podiumBody: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  podiumLaurelStack: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  // Outer wrap centers the row both axes inside the laurel; inner row
  // baseline-aligns the big number with the smaller ordinal suffix.
  podiumOrdinalAbs: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumOrdinalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  podiumOrdinalNumber: {
    fontFamily: FONTS.medium,
    fontWeight: "500",
    color: COLORS.neutral.white,
    includeFontPadding: false,
  },
  podiumOrdinalSuffix: {
    fontFamily: FONTS.medium,
    fontWeight: "500",
    color: COLORS.neutral.white,
    marginLeft: 2,
    includeFontPadding: false,
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
  rowTop: {
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
