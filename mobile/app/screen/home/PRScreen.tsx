import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { TrophyGold } from "@/assets/images";
import GlassFill from "@/app/components/common/GlassFill";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TROPHY_SIZE = Math.round(SCREEN_WIDTH * 1.075);
const TROPHY_TOP_OFFSET = -90;
const TOP_GRADIENT_HEIGHT = 237;

const PRScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "PRScreen">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { t } = useTranslation();

  const {
    exerciseName,
    exerciseCategory,
    weight,
    reps,
    previousBest,
    points,
  } = route.params;

  return (
    <View style={styles.root}>
      {/* Gold gradient backdrop covering the top area */}
      <LinearGradient
        colors={["rgba(201,168,76,0.4)", "rgba(201,168,76,0)"]}
        style={[
          styles.topGradient,
          { height: TOP_GRADIENT_HEIGHT + insets.top },
        ]}
        pointerEvents="none"
      />

      {/* Trophy — ribbon extends above status bar */}
      <View
        style={[
          styles.trophyWrap,
          { marginTop: insets.top + TROPHY_TOP_OFFSET },
        ]}
        pointerEvents="none"
      >
        <Image
          source={TrophyGold}
          style={{ width: TROPHY_SIZE, height: TROPHY_SIZE }}
          resizeMode="contain"
        />
      </View>

      {/* Title + points badge */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{t("workout.ui.newPR")}</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>
            {t("workout.ui.eraPoints", { count: points })}
          </Text>
        </View>
      </View>

      {/* Exercise details */}
      <View style={styles.detailsSection}>
        <View style={styles.exerciseCard}>
          <Text style={styles.exerciseCategory}>{exerciseCategory}</Text>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
        </View>

        <Text style={styles.record}>
          {weight}  x  {reps} reps
        </Text>

        <Text style={styles.previousBest}>
          {t("workout.ui.previousBest", { value: previousBest })}
        </Text>
      </View>

      {/* Continue button */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        <PressableScale
          style={styles.continueBtn}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={[
              "rgba(201,168,76,0.6)",
              "rgba(247,224,111,0.6)",
              "rgba(252,243,192,0.6)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <GlassFill />
          <Text style={styles.continueBtnText}>{t("common.continue")}</Text>
        </PressableScale>
      </View>
    </View>
  );
};

export default PRScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  trophyWrap: {
    alignItems: "center",
  },
  titleSection: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: -24,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 32,
    fontWeight: "500",
    lineHeight: 38.4,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  pointsBadge: {
    backgroundColor: "#342C15",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pointsText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 19.2,
    color: COLORS.neutral.white,
  },
  detailsSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 20,
  },
  exerciseCard: {
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  exerciseCategory: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
    textAlign: "center",
  },
  exerciseName: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    lineHeight: 33.6,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  record: {
    fontFamily: FONTS.semiBold,
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 36,
    color: "#FFFFFF",
    textAlign: "center",
  },
  previousBest: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 16.8,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  bottomSection: {
    paddingHorizontal: 20,
  },
  continueBtn: {
    height: 53,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  continueBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.neutral.white,
    textAlign: "center",
    letterSpacing: 0.36,
  },
});
