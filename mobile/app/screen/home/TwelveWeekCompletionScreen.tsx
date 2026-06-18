import FallingStreaks from "@/app/components/common/FallingStreaks";
import GoldGradientText from "@/app/components/common/GoldGradientText";
import PrimaryButton from "@/app/components/common/PrimaryButton";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import type { RootState } from "@/app/stores/store";
import { TwelveWeekCompletion, TwelveWeekDiamond } from "@/assets/images";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const TwelveWeekCompletionScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { t } = useTranslation();
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  // Stats sourced from the slices loaded during the cycle:
  //   - sessions: workout.completedDayIds (program_day_ids of completed sessions)
  //   - PRs:      pr.latestPRs (server-side latest 50, sufficient for a 12-week cycle)
  //   - points:   reward.totalPoints (lifetime ERA points)
  const sessionCount = useSelector((s: RootState) => s.workout.completedDayIds.length);
  const prCount = useSelector((s: RootState) => s.pr.latestPRs.length);
  const points = useSelector((s: RootState) => s.reward.totalPoints);

  const handleNext = () => {
    navigation.navigate("WhatComesNow");
  };

  return (
    <View
      style={styles.root}
      onLayout={(e) =>
        setScreenSize({
          
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      <Image source={TwelveWeekCompletion} style={styles.bgImage} resizeMode="cover" />

      {screenSize.height > 0 ? (
        <FallingStreaks height={screenSize.height} width={screenSize.width} />
      ) : null}

      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.hero}>
          <GoldGradientText text="ERA" fontSize={60} width={260} viewBoxWidth={260} />

          <Image source={TwelveWeekDiamond} style={styles.diamond} resizeMode="contain" />

          <View style={styles.titleWrap}>
            <GoldGradientText
              text={t("twelveWeekCompletion.title")}
              fontSize={32}
              viewBoxWidth={380}
            />
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillText}>{t("twelveWeekCompletion.weekComplete")}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard value={String(sessionCount)} label={t("twelveWeekCompletion.statSessions")} />
          <StatCard value={String(prCount)} label={t("twelveWeekCompletion.statPrs")} />
          <StatCard value={String(points)} label={t("twelveWeekCompletion.statPoints")} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.recap}>{t("twelveWeekCompletion.recap")}</Text>

          <PrimaryButton label={t("twelveWeekCompletion.cta")} onPress={handleNext} />
        </View>
      </View>
    </View>
  );
};

export default TwelveWeekCompletionScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  hero: {
    alignItems: "center",
  },
  diamond: {
    width: 120,
    height: 120,
    opacity: 0.9,
    marginTop: 12,
  },
  titleWrap: {
    width: "100%",
    marginTop: 24,
    alignItems: "center",
  },
  pill: {
    backgroundColor: "#342C15",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 20,
  },
  pillText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 19.2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: "auto",
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 24,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.alpha.white50,
    letterSpacing: 0.48,
    textTransform: "uppercase",
    lineHeight: 14.4,
    textAlign: "center",
  },
  footer: {
    marginTop: 24,
    gap: 24,
  },
  recap: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.alpha.white50,
    lineHeight: 22.4,
    textAlign: "center",
  },
});
