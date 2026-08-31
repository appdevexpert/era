import MuscleHighlightBadge, {
  type MuscleHighlightKey,
} from "@/app/components/common/MuscleHighlightBadge";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList, MuscleGroup } from "@/app/navigation/types";
import {
  ArrowBack,
  FocusMuscleAbs,
  FocusMuscleFront,
  FocusMuscleLeg,
} from "@/assets/icons";
import { BlurView } from "expo-blur";
import type { FC } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

const MUSCLE_ICON_SIZE = 44;

// New Figma close-up badges (5097:7786 etc.) — composited from body
// silhouette + muscle highlight. Same SVG for everyone, no gender split.
const FIGMA_BADGES: Partial<Record<MuscleGroup, MuscleHighlightKey>> = {
  shoulder: "shoulder",
  shoulders: "shoulder",
  chest: "chest",
  tricep: "tricep",
  bicep: "bicep",
  arm: "bicep",
  forearm: "forearm",
  back: "back",
  traps: "traps",
  neck: "neck",
  quads: "quads",
  glutes: "glutes",
  hamstring: "hamstring",
  calves: "calves",
};

// Legacy single-glyph badges kept for the muscles the new Figma set doesn't
// cover yet (abs, leg, front).
const LEGACY_ICONS: Partial<Record<MuscleGroup, FC<SvgProps>>> = {
  abs: FocusMuscleAbs,
  leg: FocusMuscleLeg,
  front: FocusMuscleFront,
};

const LEGACY_SVG_SIZE = 64;

const LegacyCircle = ({ Icon }: { Icon: FC<SvgProps> }) => (
  <View style={styles.muscleCircle}>
    <Icon width={LEGACY_SVG_SIZE} height={LEGACY_SVG_SIZE} />
  </View>
);

const WorkoutPlanHeader = ({ navigation, route }: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = (route as RouteProp<HomeStackParamList, "WorkoutPlan">).params;

  const subtitle = params?.subtitle ?? "";
  const title = params?.title ?? t("workout.ui.workoutPlan");
  const muscles = params?.muscles;
  const hasIcons = muscles && muscles.length > 0;

  const content = (
    <View style={styles.content}>
      {hasIcons ? (
        <View style={styles.row}>
          <View style={styles.left}>
            <PressableScale onPress={() => navigation.goBack()} hitSlop={12}>
              <ArrowBack width={24} height={24} />
            </PressableScale>
            <View style={styles.textBlock}>
              <Text style={styles.subtitle}>{subtitle}</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
          </View>
          <View style={styles.muscleGrid}>
            {muscles.map((key) => {
              const figmaKey = FIGMA_BADGES[key];
              if (figmaKey) {
                return <MuscleHighlightBadge key={key} muscle={figmaKey} />;
              }
              const LegacyIcon = LEGACY_ICONS[key];
              return LegacyIcon ? (
                <LegacyCircle key={key} Icon={LegacyIcon} />
              ) : null;
            })}
          </View>
        </View>
      ) : (
        <>
          <PressableScale onPress={() => navigation.goBack()} hitSlop={12}>
            <ArrowBack width={24} height={24} />
          </PressableScale>
          <View style={styles.textBlock}>
            <Text style={styles.subtitle}>{subtitle}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
        </>
      )}
    </View>
  );

  // Android's blur (dimezisBlurView) only softens what scrolls behind the
  // header — the container background never lands on top of it, so titles and
  // day pills stayed legible through the bar. Use an opaque surface there;
  // it matches every screen root that mounts this header (#0A0A0A). iOS keeps
  // the real glass blur.
  if (Platform.OS === "android") {
    return (
      <View
        style={[
          styles.container,
          styles.containerAndroid,
          { paddingTop: insets.top },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <BlurView
      intensity={24}
      tint="dark"
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {content}
    </BlurView>
  );
};

export default WorkoutPlanHeader;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(17,17,17,0.6)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
  },
  containerAndroid: {
    backgroundColor: COLORS.neutral.black2,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  left: {
    flex: 1,
    gap: 16,
  },
  textBlock: {
    gap: 6,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.primary.dark,
    textTransform: "uppercase",
    letterSpacing: 0.48,
    lineHeight: 14.4,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 33.6,
  },
  muscleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 95,
    gap: 7,
  },
  muscleCircle: {
    width: MUSCLE_ICON_SIZE,
    height: MUSCLE_ICON_SIZE,
    borderRadius: MUSCLE_ICON_SIZE / 2,
    backgroundColor: COLORS.alpha.white08,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
