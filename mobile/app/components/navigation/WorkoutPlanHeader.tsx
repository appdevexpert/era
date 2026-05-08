import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList, MuscleGroup } from "@/app/navigation/types";
import {
  ArrowBack,
  FocusMuscleChest,
  FocusMuscleShoulders,
  FocusMuscleArm,
  FocusMuscleAbs,
  FocusMuscleLeg,
  FocusMuscleFront,
} from "@/assets/icons";
import { BlurView } from "expo-blur";
import type { FC } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

const MUSCLE_ICON_SIZE = 44;
const MUSCLE_SVG_SIZE = 64;

const MUSCLE_MAP: Record<MuscleGroup, FC<SvgProps>> = {
  chest: FocusMuscleChest,
  shoulders: FocusMuscleShoulders,
  arm: FocusMuscleArm,
  abs: FocusMuscleAbs,
  leg: FocusMuscleLeg,
  front: FocusMuscleFront,
};

const MuscleCircle = ({ Icon }: { Icon: FC<SvgProps> }) => (
  <View style={styles.muscleCircle}>
    <Icon width={MUSCLE_SVG_SIZE} height={MUSCLE_SVG_SIZE} />
  </View>
);

const WorkoutPlanHeader = ({ navigation, route }: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const params = (route as RouteProp<HomeStackParamList, "WorkoutPlan">).params;

  const subtitle = params?.subtitle ?? "12 Week Personalized";
  const title = params?.title ?? "Workout Plan";
  const muscles = params?.muscles;
  const hasIcons = muscles && muscles.length > 0;

  return (
    <BlurView intensity={24} tint="dark" style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {hasIcons ? (
          <View style={styles.row}>
            <View style={styles.left}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
                <ArrowBack width={24} height={24} />
              </Pressable>
              <View style={styles.textBlock}>
                <Text style={styles.subtitle}>{subtitle}</Text>
                <Text style={styles.title}>{title}</Text>
              </View>
            </View>
            <View style={styles.muscleGrid}>
              {muscles.map((key) => {
                const Icon = MUSCLE_MAP[key];
                return Icon ? <MuscleCircle key={key} Icon={Icon} /> : null;
              })}
            </View>
          </View>
        ) : (
          <>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
              <ArrowBack width={24} height={24} />
            </Pressable>
            <View style={styles.textBlock}>
              <Text style={styles.subtitle}>{subtitle}</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
          </>
        )}
      </View>
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
