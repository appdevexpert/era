import AddComment from "@/app/components/common/AddComment";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import GlassFill from "@/app/components/common/GlassFill";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/stores/store";
import { useWeightUnit } from "@/app/hooks/useWeightUnit";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

type SetSummary = {
  weight: string;
  reps: number;
  setNumber: number;
  duration?: number | null;
};

type ExerciseCompletedBottomSheetProps = {
  /** Sheet subscribes to Redux `completedSets[exerciseLibraryId]` directly so the
   *  latest set shows up even when present() fires before the parent re-renders. */
  exerciseLibraryId: string | undefined;
  /** Previously-saved per-exercise comment, used to prefill the textarea on revisit. */
  initialComment?: string;
  onContinue: (comment: string) => void;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const SetCard = ({ set }: { set: SetSummary }) => {
  const { t } = useTranslation();
  const isTimed = set.duration != null && set.duration > 0;
  return (
    <View style={styles.setCard}>
      <Text style={styles.setCardValue}>
        {isTimed
          ? formatDuration(set.duration!)
          : t("workout.ui.repsFormat", { weight: set.weight, reps: set.reps })}
      </Text>
      <Text style={styles.setCardLabel}>
        {t("workout.ui.setLabel", { number: set.setNumber }).toUpperCase()}
      </Text>
    </View>
  );
};

/**
 * Shown after the last set of an exercise is logged. Rendered as a
 * `BottomSheetModal` (portal), so it lives outside `WorkoutLogScreen`'s
 * layout tree and doesn't fight the parent ScrollView for keyboard insets.
 *
 * `AddComment` uses plain `TextInput` (not `BottomSheetTextInput`), which
 * removes gorhom's `animatedKeyboardState` shared-value writes on focus/blur
 * — the source of the close-crash race with the sheet's dismiss worklet.
 */
const ExerciseCompletedBottomSheet = forwardRef<BottomSheetModal, ExerciseCompletedBottomSheetProps>(
  function ExerciseCompletedBottomSheet({ exerciseLibraryId, initialComment = "", onContinue }, ref) {
    const { t } = useTranslation();
    const [comment, setComment] = useState(initialComment);

    const { format: formatWeight } = useWeightUnit();
    const loggedMap = useSelector((state: RootState) =>
      exerciseLibraryId ? state.session.completedSets[exerciseLibraryId] ?? null : null,
    );
    const sets = useMemo<SetSummary[]>(() => {
      if (!loggedMap) return [];
      return Object.entries(loggedMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([key, s]) => ({
          weight: s.weight != null ? formatWeight(s.weight) : "—",
          reps: s.reps ?? 0,
          setNumber: Number(key) + 1,
          duration: s.duration,
        }));
    }, [loggedMap, formatWeight]);

    // Keep the textarea in sync with the latest prefill when the user navigates
    // between exercises (this component is mounted continuously on the parent).
    useEffect(() => {
      setComment(initialComment);
    }, [initialComment]);

    const handleContinue = useCallback(() => {
      onContinue(comment);
    }, [comment, onContinue]);

    // The sheet stays mounted across dismissals, so AddComment's unmount
    // cleanup can't cover a swipe-down / continue press. Stop the mic
    // explicitly when the sheet dismisses.
    const handleDismiss = useCallback(() => {
      ExpoSpeechRecognitionModule.stop();
    }, []);

    return (
      <BottomSheetModal
        ref={ref}
        enablePanDownToClose
        snapPoints={["70%", "90%"]}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
        onDismiss={handleDismiss}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{t("workout.ui.exerciseCompleted")}</Text>
          </View>

          <View style={styles.setsRow}>
            {sets.map((set) => (
              <SetCard key={set.setNumber} set={set} />
            ))}
          </View>

          <AddComment
            key={exerciseLibraryId ?? "empty"}
            value={comment}
            onChangeText={setComment}
          />

          <PressableScale style={styles.continueBtn} onPress={handleContinue}>
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
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

ExerciseCompletedBottomSheet.displayName = "ExerciseCompletedBottomSheet";

export default ExerciseCompletedBottomSheet;

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
    gap: 20,
  },
  titleWrap: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    lineHeight: 26.4,
    color: COLORS.neutral.white,
  },
  setsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  setCard: {
    width: "31%",
    backgroundColor: COLORS.neutral.black2,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    gap: 8,
  },
  setCardValue: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 19.2,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  setCardLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    textAlign: "center",
    letterSpacing: 0.48,
  },
  continueBtn: {
    height: 53,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 8,
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
