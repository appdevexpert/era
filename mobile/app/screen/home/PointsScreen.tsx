import { ArrowBack, FireGold, IconDumbbell, CameraIcon, ChartGold, ChevronBack } from "@/assets/icons";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import PointsOptimizeBottomSheet, {
  type PointsOptimizeBottomSheetRef,
} from "@/app/components/workout/PointsOptimizeBottomSheet";
import {
  selectRecentPointEvents,
  selectTotalPoints,
} from "@/app/stores/selectors/rewardSelectors";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import { loadRewardBootstrap } from "@/app/stores/slice/rewardSlice";
import { useAppDispatch } from "@/app/stores/store";
import type { PointEventRow, PointEventType } from "@/app/services/sessionService";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import type { HomeStackParamList } from "@/app/navigation/types";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

type HistoryItem = {
  type: "streak" | "photo" | "workout";
  title: string;
  date: string;
  points: number;
};

const ICON_MAP: Record<HistoryItem["type"], React.FC<{ width: number; height: number }>> = {
  streak: FireGold,
  photo: CameraIcon,
  workout: IconDumbbell,
};

const BG_MAP: Record<HistoryItem["type"], string> = {
  streak: "#272318",
  photo: "rgba(201,168,76,0.12)",
  workout: "rgba(201,168,76,0.12)",
};

const HistoryRow = ({ item }: { item: HistoryItem }) => {
  const Icon = ICON_MAP[item.type];
  return (
    <View style={styles.historyRow}>
      <View style={[styles.iconCircle, { backgroundColor: BG_MAP[item.type] }]}>
        <Icon width={29} height={29} />
      </View>
      <View style={styles.historyText}>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historyDate}>{item.date}</Text>
      </View>
      <Text style={styles.historyPoints}>+{item.points}</Text>
    </View>
  );
};

// Each point_event_type maps to one of the three icon variants we have today.
const EVENT_TYPE_ICON: Record<PointEventType, HistoryItem["type"]> = {
  workout_completed: "workout",
  exercise_completed: "workout",
  personal_record: "workout",
  cardio_completed: "workout",
  set_logged: "workout",
  streak_added: "streak",
  progress_photo_added: "photo",
  manual_adjustment: "workout",
  body_weight_logged: "workout",
};

// Today's ISO date (UTC) — used to format event dates as "Today" / "Yesterday" / "DD Month".
const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

const formatEventDate = (
  iso: string,
  t: (key: string) => string,
): string => {
  const todayIso = toIsoDate(new Date());
  const yesterdayIso = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toIsoDate(d);
  })();
  const eventIso = iso.slice(0, 10);
  if (eventIso === todayIso) return t("workout.ui.today");
  if (eventIso === yesterdayIso) return t("workout.ui.yesterday");
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
};

const PointsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { t } = useTranslation();
  const optimizeSheetRef = useRef<PointsOptimizeBottomSheetRef>(null);
  const recentEvents = useSelector(selectRecentPointEvents);
  const totalPoints = useSelector(selectTotalPoints);
  const user = useSelector(selectUser);
  const dispatch = useAppDispatch();

  // Refetch on mount so the screen always shows the freshest history,
  // even if Redux was stale (e.g. when arriving here right after a session).
  useEffect(() => {
    if (user?.id) dispatch(loadRewardBootstrap(user.id));
  }, [dispatch, user?.id]);

  const historyItems: HistoryItem[] = useMemo(
    () =>
      recentEvents.map((evt: PointEventRow) => ({
        type: EVENT_TYPE_ICON[evt.event_type] ?? "workout",
        title: evt.title,
        date: formatEventDate(evt.occurred_at, t),
        points: evt.points,
      })),
    [recentEvents, t],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 120, paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Tip card */}
        <PressableScale style={styles.tipCard} onPress={() => optimizeSheetRef.current?.show()}>
          <ChartGold width={42} height={42} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>{t("workout.ui.howToOptimise")}</Text>
            <Text style={styles.tipDesc}>{t("workout.ui.howToOptimiseDesc")}</Text>
          </View>
          <ChevronBack
            width={16}
            height={16}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </PressableScale>

        {/* History */}
        <Text style={styles.sectionLabel}>{t("workout.ui.history")}</Text>
        <View style={styles.historyList}>
          {historyItems.length === 0 ? (
            <Text style={styles.historyEmpty}>{t("workout.ui.noPointsYet")}</Text>
          ) : (
            historyItems.map((item, i) => <HistoryRow key={i} item={item} />)
          )}
        </View>
      </ScrollView>

      {/* Header overlay */}
      <BlurView
        intensity={24}
        tint="dark"
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <PressableScale onPress={() => navigation.goBack()} hitSlop={12}>
            <ArrowBack width={24} height={24} />
          </PressableScale>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{t("workout.ui.pointsTitle")}</Text>
            <Svg height={50} width={200}>
              <Defs>
                <SvgGradient id="ptGrad" x1="1" y1="0" x2="0" y2="0">
                  <Stop offset="0" stopColor="#FCF3C0" />
                  <Stop offset="0.196" stopColor="#F7E06F" />
                  <Stop offset="0.835" stopColor="#C9A84C" />
                </SvgGradient>
              </Defs>
              <SvgText
                fill="url(#ptGrad)"
                fontSize={42}
                fontWeight="500"
                fontFamily={Platform.OS === "ios" ? "System" : "Roboto"}
                x={0}
                y={38}
              >
                {totalPoints}
              </SvgText>
            </Svg>
          </View>
        </View>
      </BlurView>

      {/* Bottom fade */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.8)"]}
        locations={[0, 0.51]}
        style={styles.bottomFade}
      />

      <PointsOptimizeBottomSheet ref={optimizeSheetRef} />
    </View>
  );
};

export default PointsScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },

  /* Header */
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(17,17,17,0.6)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },

  /* Tip card */
  tipCard: {
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    gap: 8,
  },
  tipContent: {
    flex: 1,
    gap: 6,
  },
  tipTitle: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 19.2,
    color: COLORS.neutral.white,
  },
  tipDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16.8,
    color: "rgba(240,240,240,0.6)",
  },

  /* History */
  sectionLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.6)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
    marginTop: 8,
  },
  historyList: {
    gap: 12,
  },
  historyEmpty: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
    paddingVertical: 24,
  },
  historyRow: {
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 137,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  historyText: {
    flex: 1,
    gap: 6,
  },
  historyTitle: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 21.6,
    color: COLORS.neutral.white,
  },
  historyDate: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.6)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  historyPoints: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.semantic.success,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },

  /* Bottom fade */
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 121,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    overflow: "hidden",
  },
});
