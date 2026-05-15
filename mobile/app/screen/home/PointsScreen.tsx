import { ArrowBack, FireGold, IconDumbbell, CameraIcon, ChartGold, ChevronBack } from "@/assets/icons";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
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

const STATIC_HISTORY: HistoryItem[] = [
  { type: "streak", title: "workout.ui.streakAdded", date: "workout.ui.today", points: 25 },
  { type: "photo", title: "workout.ui.photoAdded", date: "workout.ui.yesterday", points: 25 },
  { type: "workout", title: "workout.ui.workoutCompleted", date: "workout.ui.yesterday", points: 25 },
  { type: "workout", title: "workout.ui.workoutCompleted", date: "28 April", points: 25 },
  { type: "workout", title: "workout.ui.workoutCompleted", date: "28 April", points: 25 },
  { type: "workout", title: "workout.ui.workoutCompleted", date: "28 April", points: 25 },
];

const PointsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { t } = useTranslation();

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
        <Pressable style={styles.tipCard}>
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
        </Pressable>

        {/* History */}
        <Text style={styles.sectionLabel}>{t("workout.ui.history")}</Text>
        <View style={styles.historyList}>
          {STATIC_HISTORY.map((item, i) => {
            const translatedTitle = item.title.startsWith("workout.")
              ? t(item.title)
              : item.title;
            const translatedDate = item.date.startsWith("workout.")
              ? t(item.date)
              : item.date;
            return (
              <HistoryRow
                key={i}
                item={{ ...item, title: translatedTitle, date: translatedDate }}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Header overlay */}
      <BlurView
        intensity={24}
        tint="dark"
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <ArrowBack width={24} height={24} />
          </Pressable>
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
                3240
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
