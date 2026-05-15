import AddComment from "@/app/components/workout/AddComment";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import React, { forwardRef, useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";

type SetSummary = {
  weight: string;
  reps: number;
  setNumber: number;
};

type ExerciseCompletedSheetProps = {
  sets: SetSummary[];
  onContinue: (comment: string) => void;
};

const SetCard = ({ set }: { set: SetSummary }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.setCard}>
      <Text style={styles.setCardValue}>
        {t("workout.ui.repsFormat", { weight: set.weight, reps: set.reps })}
      </Text>
      <Text style={styles.setCardLabel}>
        {t("workout.ui.setLabel", { number: set.setNumber }).toUpperCase()}
      </Text>
    </View>
  );
};

const ExerciseCompletedSheet = forwardRef<BottomSheet, ExerciseCompletedSheetProps>(
  function ExerciseCompletedSheet({ sets, onContinue }, ref) {
    const { t } = useTranslation();
    const [comment, setComment] = useState("");

    const handleContinue = useCallback(() => {
      onContinue(comment);
    }, [comment, onContinue]);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        enablePanDownToClose
        snapPoints={["50%"]}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{t("workout.ui.exerciseCompleted")}</Text>
          </View>

          {/* Set summary cards */}
          <View style={styles.setsRow}>
            {sets.map((set) => (
              <SetCard key={set.setNumber} set={set} />
            ))}
          </View>

          {/* Add Comments */}
          <AddComment value={comment} onChangeText={setComment} />

          {/* Continue button */}
          <Pressable style={styles.continueBtn} onPress={handleContinue}>
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
            <GlassView
              pointerEvents="none"
              glassEffectStyle="regular"
              colorScheme="dark"
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.continueBtnText}>{t("common.continue")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

ExerciseCompletedSheet.displayName = "ExerciseCompletedSheet";

export default ExerciseCompletedSheet;

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
    gap: 8,
  },
  setCard: {
    flex: 1,
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
