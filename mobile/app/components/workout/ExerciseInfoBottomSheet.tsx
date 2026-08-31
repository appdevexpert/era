import SheetBackHandler from "@/app/components/common/SheetBackHandler";
import ExerciseAnimationCard from "@/app/components/workout/ExerciseAnimationCard";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

/**
 * Everything the sheet shows for one exercise. Assembled by the caller, not
 * fetched here — the weight tile must read exactly what the list row reads
 * (initial vs. Smart-Weight suggestion), so the caller passes its own already
 * computed label/value instead of the sheet re-deriving them.
 */
export interface ExerciseInfoPayload {
  name: string;
  /** Localized "Back • Compound". */
  muscleCategory: string;
  video: string | null;
  videoLoop: boolean;
  setCount: number;
  /** "12-18" for reps, "45 SEC" for timed work. */
  targetLabel: string;
  targetKind: "reps" | "time";
  /** "Initial WT." / "Suggested WT." — already localized by the caller. */
  weightLabel: string;
  /** "80 kg", or empty when the exercise carries no load. */
  weightValue: string;
  /** Form cues; empty hides the whole block. */
  formDetail: string;
}

export interface ExerciseInfoBottomSheetRef {
  show: (payload: ExerciseInfoPayload) => void;
}

const StatTile = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.statTile}>
    <Text numberOfLines={1} style={styles.statValue}>
      {value}
    </Text>
    <Text numberOfLines={1} style={styles.statLabel}>
      {label}
    </Text>
  </View>
);

/**
 * Exercise info sheet — opened by tapping a row on the Exercise List screen.
 * Read-only: name, target muscle, demo clip, the day's prescription, and the
 * form cues. Nothing here starts or edits a workout.
 */
const ExerciseInfoBottomSheet = forwardRef<ExerciseInfoBottomSheetRef>(
  function ExerciseInfoBottomSheet(_props, ref) {
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);
    const { t } = useTranslation();
    const [data, setData] = useState<ExerciseInfoPayload | null>(null);

    useImperativeHandle(ref, () => ({
      show: (payload: ExerciseInfoPayload) => {
        setData(payload);
        sheetRef.current?.present();
      },
    }));

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
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <SheetBackHandler />
        {/* Scrollable because long form cues can outgrow the sheet's max height. */}
        <BottomSheetScrollView
          contentContainerStyle={[
            // Edge-to-edge puts the sheet's bottom edge BEHIND the system nav
            // bar, so the last row needs the inset on top of its designed
            // padding. Math.max keeps the design on devices that report none.
            styles.content,
            { paddingBottom: Math.max(42, insets.bottom + 16) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {data ? (
            <>
              <View style={styles.titleBlock}>
                <Text style={styles.title}>{data.name}</Text>
                {data.muscleCategory ? (
                  <Text style={styles.subtitle}>{data.muscleCategory}</Text>
                ) : null}
              </View>

              {/* Gutters live on the wrapper: the card is `width: "100%"`, so a
                  margin on the card itself would push it past the sheet edge and
                  clip the clip. Gated on `video` so an exercise with no clip
                  doesn't leave an empty 24pt gap where the tile would be. */}
              {data.video ? (
                <View style={styles.mediaWrap}>
                  <ExerciseAnimationCard video={data.video} loop={data.videoLoop} />
                </View>
              ) : null}

              <View style={styles.statsRow}>
                <StatTile
                  value={String(data.setCount)}
                  label={t("workout.ui.setsLabel")}
                />
                <StatTile
                  value={data.targetLabel}
                  label={
                    data.targetKind === "time"
                      ? t("workout.ui.timeLabel")
                      : t("workout.ui.repsLabel")
                  }
                />
                {data.weightValue ? (
                  <StatTile value={data.weightValue} label={data.weightLabel} />
                ) : null}
              </View>

              {data.formDetail ? (
                <View style={styles.formBlock}>
                  <Text style={styles.formLabel}>{t("workout.ui.formDetail")}</Text>
                  <Text style={styles.formBody}>{data.formDetail}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

ExerciseInfoBottomSheet.displayName = "ExerciseInfoBottomSheet";

export default ExerciseInfoBottomSheet;

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: COLORS.neutral.black3,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 54,
    height: 4,
    borderRadius: 12345,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 42,
    gap: 24,
  },

  /* Title */
  titleBlock: {
    paddingHorizontal: 16,
    gap: 12,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    lineHeight: 26.4,
    color: COLORS.neutral.white,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },

  /* Demo clip */
  mediaWrap: {
    paddingHorizontal: 16,
  },

  /* Stat tiles */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  statTile: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: COLORS.alpha.surface06,
  },
  statValue: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 19.2,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },

  /* Form detail */
  formBlock: {
    paddingHorizontal: 16,
    gap: 8,
  },
  formLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  formBody: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22.4,
    color: COLORS.neutral.white,
  },
});
