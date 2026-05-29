import AddPhotoBottomSheet, {
  type AddPhotoBottomSheetRef,
} from "@/app/components/common/AddPhotoBottomSheet";
import GlassFill from "@/app/components/common/GlassFill";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { clearSession } from "@/app/stores/slice/sessionSlice";
import { uploadProgressPhotoThunk } from "@/app/stores/slice/photoSlice";
import { useAppDispatch } from "@/app/stores/store";
import { CameraIcon } from "@/assets/icons";
import { PrTrophy } from "@/assets/images";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const SessionCompleteScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "SessionComplete">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const {
    sessionId,
    programTitle,
    weekNumber,
    dayNumber,
    sessionDuration,
    setsLogged,
    eraPoints,
    newPRs,
    bonusPoints,
  } = route.params;

  const addPhotoSheetRef = useRef<AddPhotoBottomSheetRef>(null);

  const handlePhotoSelected = async (photo: { uri: string }) => {
    const action = await dispatch(
      uploadProgressPhotoThunk({
        localUri: photo.uri,
        sessionId: sessionId ?? null,
      }),
    );
    if (uploadProgressPhotoThunk.fulfilled.match(action)) {
      const { pointsAwarded } = action.payload;
      Toast.show({
        type: "success",
        text2:
          pointsAwarded > 0
            ? t("progress.addPhoto.uploadedWithPoints", { points: pointsAwarded })
            : t("progress.addPhoto.uploadedNoPoints"),
        visibilityTime: 2500,
      });
    } else {
      Toast.show({
        type: "error",
        text2: t("progress.addPhoto.uploadFailed"),
        visibilityTime: 3000,
      });
    }
  };

  const subtitle =
    `${programTitle} \u2022 ${t("workout.ui.weekLabel", { number: weekNumber })} \u2022 ${t("workout.ui.dayLabel", { number: dayNumber })}`.toUpperCase();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Trophy + Title */}
      <View style={styles.topSection}>
        <Image source={PrTrophy} style={styles.trophy} />
        <Text style={styles.title}>{t("workout.ui.sessionComplete")}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>
            {t("workout.ui.eraPoints", { count: bonusPoints })}
          </Text>
        </View>
      </View>

      {/* Stat grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            label={t("workout.ui.sessionDuration")}
            value={sessionDuration}
          />
          <StatCard
            label={t("workout.ui.setsLogged")}
            value={String(setsLogged)}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label={t("workout.ui.eraPointsLabel")}
            value={`+${eraPoints}`}
          />
          <StatCard
            label={t("workout.ui.newPRs")}
            value={String(newPRs)}
          />
        </View>
      </View>

      {/* Bottom buttons */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        {/* Capture Progress */}
        <PressableScale
          style={styles.captureBtn}
          onPress={() => addPhotoSheetRef.current?.show()}
        >
          <GlassFill />
          <CameraIcon width={24} height={24} />
          <Text style={styles.captureBtnText}>
            {t("workout.ui.captureProgress")}
          </Text>
        </PressableScale>

        {/* Continue */}
        <PressableScale
          style={styles.continueBtn}
          onPress={() => {
            dispatch(clearSession());
            navigation.popToTop();
          }}
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

      <AddPhotoBottomSheet
        ref={addPhotoSheetRef}
        onPhotoSelected={handlePhotoSelected}
      />
    </View>
  );
};

export default SessionCompleteScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
    paddingHorizontal: 20,
  },
  topSection: {
    alignItems: "center",
    marginTop: 40,
    gap: 8,
  },
  trophy: {
    width: 140,
    height: 140,
    opacity: 0.8,
    marginBottom: 8,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 32,
    fontWeight: "500",
    lineHeight: 38.4,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textAlign: "center",
  },
  pointsBadge: {
    backgroundColor: "#342C15",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  pointsText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 19.2,
    color: COLORS.neutral.white,
  },
  statsGrid: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
    textAlign: "center",
  },
  statValue: {
    fontFamily: FONTS.medium,
    fontSize: 40,
    fontWeight: "500",
    lineHeight: 48,
    color: COLORS.neutral.white,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  bottomSection: {
    gap: 12,
  },
  captureBtn: {
    height: 48,
    borderRadius: 999,

    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
  },
  captureBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 19.2,
    color: COLORS.neutral.white,
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
