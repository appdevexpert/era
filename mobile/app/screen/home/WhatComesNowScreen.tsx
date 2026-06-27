import ChoiceCard from "@/app/components/common/ChoiceCard";
import GoldGradientText from "@/app/components/common/GoldGradientText";
import PrimaryButton from "@/app/components/common/PrimaryButton";
import PressableScale from "@/app/components/common/PressableScale";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import {
  type CycleChoice,
  startNextCycle,
} from "@/app/services/assignmentService";
import { useRequireEntitlement } from "@/app/hooks/useRequireEntitlement";
import { loadWorkoutBootstrap } from "@/app/stores/slice/workoutSlice";
import { useAppDispatch } from "@/app/stores/store";
import { AltArrowLeft } from "@/assets/icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import type { RootState } from "@/app/stores/store";

type ChoiceKey = "restart" | "deload" | "next";

const CHOICE_TO_RPC: Record<ChoiceKey, CycleChoice> = {
  restart: "heavier",
  deload: "deload",
  next: "bro_split",
};

const WhatComesNowScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const gender = useSelector((s: RootState) => s.onboarding.goalData.gender);
  // Bro Split is a Standard+ unlock per PAYMENT_FEATURE.md. Free users
  // tapping Confirm with "next" selected get bounced to the paywall.
  const requireEntitlement = useRequireEntitlement();

  const [selected, setSelected] = useState<ChoiceKey>("restart");
  const [submitting, setSubmitting] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Female users at launch get only Heavier + Deload — Bro Split is male-only.
  const choices = useMemo(() => {
    const base: { key: ChoiceKey; titleKey: string; badgeKey: string; bulletsKey: string }[] = [
      { key: "restart", titleKey: "whatComesNow.restart.title", badgeKey: "whatComesNow.restart.badge", bulletsKey: "whatComesNow.restart.bullets" },
      { key: "deload", titleKey: "whatComesNow.deload.title", badgeKey: "whatComesNow.deload.badge", bulletsKey: "whatComesNow.deload.bullets" },
    ];
    if (gender === "male") {
      base.push({
        key: "next",
        titleKey: "whatComesNow.next.title",
        badgeKey: "whatComesNow.next.badge",
        bulletsKey: "whatComesNow.next.bullets",
      });
    }
    return base;
  }, [gender]);

  const handleConfirm = async () => {
    if (submitting) return;
    if (selected === "next" && !requireEntitlement("standard")) return;
    setSubmitting(true);
    try {
      await startNextCycle(CHOICE_TO_RPC[selected]);
      // Force-reload workout cache so the next cycle's program + assignment land in Redux
      await dispatch(loadWorkoutBootstrap({})).unwrap();
      navigation.navigate("Cycle2Begins");
    } catch (err) {
      Toast.show({
        type: "error",
        text1: t("whatComesNow.errorTitle", { defaultValue: "Couldn't start next cycle" }),
        text2: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 140 },
        ]}
      >
        {choices.map((c) => (
          <ChoiceCard
            key={c.key}
            title={t(c.titleKey)}
            badge={t(c.badgeKey)}
            bullets={t(c.bulletsKey, { returnObjects: true }) as string[]}
            selected={selected === c.key}
            onSelect={() => setSelected(c.key)}
          />
        ))}
      </ScrollView>

      <BlurView
        intensity={30}
        tint="dark"
        style={[styles.header, { paddingTop: insets.top + 4 }]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <PressableScale onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <AltArrowLeft width={24} height={24} color={COLORS.primary.dark} />
        </PressableScale>
        <View style={styles.titleGroup}>
          <GoldGradientText text={t("whatComesNow.title")} fontSize={26} align="left" viewBoxWidth={340} />
          <Text style={styles.subtitle}>{t("whatComesNow.subtitle")}</Text>
        </View>
      </BlurView>

      <LinearGradient
        colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.85)", COLORS.neutral.black2]}
        locations={[0, 0.5, 1]}
        style={[styles.bottomFade, { height: insets.bottom + 140 }]}
        pointerEvents="none"
      />

      <View style={[styles.ctaWrap, { bottom: insets.bottom + 24 }]}>
        <PrimaryButton
          label={t("whatComesNow.cta")}
          onPress={handleConfirm}
          loading={submitting}
        />
      </View>
    </View>
  );
};

export default WhatComesNowScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10,10,10,0.6)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
    paddingHorizontal: 24,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 24,
    height: 24,
  },
  titleGroup: {
    gap: 2,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18.2,
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  ctaWrap: {
    position: "absolute",
    left: 20,
    right: 20,
  },
});
