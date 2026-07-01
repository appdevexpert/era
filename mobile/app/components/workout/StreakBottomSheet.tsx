import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { FireRing } from "@/assets/icons";
import WeekDaySelector, { type DayItem } from "@/app/components/workout/WeekDaySelector";
import GlassFill from "@/app/components/common/GlassFill";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef, useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

type StreakBottomSheetProps = {
  streak: number;
  days: DayItem[];
  exercises: number;
  minutes: number;
  points: number;
  onViewPoints: () => void;
};

const RING_SIZE = 140;

const StreakBottomSheet = forwardRef<BottomSheetModal, StreakBottomSheetProps>(
  function StreakBottomSheet({ streak, days, exercises, minutes, points, onViewPoints }, ref) {
    const { t } = useTranslation();

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.6}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={["78%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={styles.content}>
          {/* Fire icon with ring */}
          <FireRing width={RING_SIZE} height={RING_SIZE} />

          {/* Streak count */}
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakTitle}>{t("workout.ui.dayStreak")}</Text>
          <Text style={styles.streakSub}>{t("workout.ui.streakMotivation")}</Text>

          {/* Week pills — reuse WeekDaySelector */}
          <View style={styles.weekRow}>
            <WeekDaySelector days={days} />
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{exercises}</Text>
              <Text style={styles.statLabel}>{t("workout.ui.exercisesLabel")}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{minutes}</Text>
              <Text style={styles.statLabel}>{t("workout.ui.minutesLabel")}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>+{points}</Text>
              <Text style={styles.statLabel}>{t("workout.ui.pointsTitle")}</Text>
            </View>
          </View>

          {/* View Points button */}
          <PressableScale style={styles.viewBtn} onPress={onViewPoints}>
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
            <Text style={styles.viewBtnText}>{t("workout.ui.viewEraPoints")}</Text>
          </PressableScale>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

StreakBottomSheet.displayName = "StreakBottomSheet";

export default StreakBottomSheet;

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: COLORS.neutral.black3,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 54,
    height: 4,
    borderRadius: 12345,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 20,
    alignItems: "center",
    gap: 12,
  },
  streakNumber: {
    fontFamily: FONTS.medium,
    fontSize: 72,
    fontWeight: "500",
    color: COLORS.neutral.white,
    textAlign: "center",
    lineHeight: 80,
  },
  streakTitle: {
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: "500",
    lineHeight: 28.8,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  streakSub: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 19.2,
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
    marginBottom: 12,
  },
  weekRow: {
    width: "100%",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.alpha.white04,
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
    lineHeight: 24,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  viewBtn: {
    width: "100%",
    height: 53,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  viewBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.neutral.white,
    textAlign: "center",
    letterSpacing: 0.36,
  },
});
