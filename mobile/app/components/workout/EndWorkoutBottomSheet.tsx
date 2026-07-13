import TintButton from "@/app/components/common/TintButton";
import { FONTS } from "@/app/constants/fonts";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

export interface EndWorkoutBottomSheetRef {
  show: () => void;
  hide: () => void;
}

interface EndWorkoutBottomSheetProps {
  onEnd?: () => void | Promise<void>;
  onPause?: () => void | Promise<void>;
}

const EndWorkoutBottomSheet = forwardRef<EndWorkoutBottomSheetRef, EndWorkoutBottomSheetProps>(
  function EndWorkoutBottomSheet({ onEnd, onPause }, ref) {
    const { t } = useTranslation();
    const sheetRef = useRef<BottomSheetModal>(null);
    // While onEnd is running (finishSession → Supabase completeSession +
    // record_workout_completion RPC + PR check), we keep the sheet open and
    // spin the End Workout button. Blocks re-taps and pan/backdrop dismissal
    // that would otherwise let the user fire a second finishSession before
    // navigation replaces this screen.
    const [ending, setEnding] = useState(false);
    const [pausing, setPausing] = useState(false);
    const busy = ending || pausing;

    useImperativeHandle(ref, () => ({
      show: () => sheetRef.current?.present(),
      hide: () => sheetRef.current?.dismiss(),
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.6}
          pressBehavior={busy ? "none" : "close"}
        />
      ),
      [busy],
    );

    const handleEnd = async () => {
      if (ending || pausing) return;
      setEnding(true);
      try {
        await onEnd?.();
      } finally {
        // Navigation inside onEnd unmounts this sheet on the happy path. If
        // it threw, reset so the user can retry rather than getting stuck.
        setEnding(false);
      }
    };

    const handlePause = async () => {
      if (ending || pausing) return;
      setPausing(true);
      try {
        await onPause?.();
      } finally {
        // Pause navigates away (unmounts the sheet) on the happy path; reset
        // on failure so the user isn't stuck.
        setPausing(false);
      }
    };

    const handleDismiss = useCallback(() => {
      setEnding(false);
      setPausing(false);
    }, []);

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose={!busy}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
        onDismiss={handleDismiss}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.upper}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{t("workout.ui.pauseOrEndTitle")}</Text>
            </View>
            <View style={styles.bodySection}>
              <Text style={styles.body}>{t("workout.ui.pauseOrEndBody")}</Text>
              <Text style={styles.subtext}>{t("workout.ui.pauseOrEndSubtext")}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TintButton
              label={t("workout.ui.pauseWorkout")}
              onPress={handlePause}
              variant="gold"
              style={styles.actionItem}
              loading={pausing}
              disabled={ending}
            />
            <TintButton
              label={t("workout.ui.endWorkout")}
              onPress={handleEnd}
              variant="destructive"
              style={styles.actionItem}
              loading={ending}
              disabled={pausing}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

EndWorkoutBottomSheet.displayName = "EndWorkoutBottomSheet";

export default EndWorkoutBottomSheet;

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 54,
    height: 4,
    borderRadius: 12345,
  },
  content: {
    gap: 36,
    paddingBottom: 42,
  },
  upper: {
    gap: 24,
  },
  titleSection: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
    gap: 12,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    color: "#F0F0F0",
    lineHeight: 26.4,
  },
  bodySection: {
    paddingHorizontal: 20,
    gap: 8,
  },
  body: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 24,
  },
  subtext: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 21,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
  },
  actionItem: {
    flex: 1,
  },
});
