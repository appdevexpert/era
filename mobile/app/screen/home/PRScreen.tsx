import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { PrTrophy } from "@/assets/images";
import GlassFill from "@/app/components/common/GlassFill";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

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
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Trophy + Title */}
      <View style={styles.topSection}>
        <Image source={PrTrophy} style={styles.trophy} />
        <Text style={styles.title}>{t("workout.ui.newPR")}</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>
            {t("workout.ui.eraPoints", { count: points })}
          </Text>
        </View>
      </View>

      {/* Exercise details */}
      <View style={styles.detailsSection}>
        {/* Exercise card */}
        <View style={styles.exerciseCard}>
          <Text style={styles.exerciseCategory}>{exerciseCategory}</Text>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
        </View>

        {/* Weight x Reps */}
        <Text style={styles.record}>
          {weight}  x  {reps} reps
        </Text>

        {/* Previous best */}
        <Text style={styles.previousBest}>
          {t("workout.ui.previousBest", { value: previousBest })}
        </Text>
      </View>

      {/* Continue button */}
      <Pressable
        style={[styles.continueBtn, { marginBottom: insets.bottom + 16 }]}
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
      </Pressable>
    </View>
  );
};

export default PRScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
    paddingHorizontal: 20,
  },
  topSection: {
    alignItems: "center",
    marginTop: 60,
    gap: 16,
  },
  trophy: {
    width: 140,
    height: 140,
    opacity: 0.8,
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
    gap: 25,
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
