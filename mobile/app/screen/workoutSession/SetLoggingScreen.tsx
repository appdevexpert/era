import BestSetCard from "@/app/components/workoutSession/BestSetCard";
import SetActionFooter from "@/app/components/workoutSession/SetActionFooter";
import SetLoggingSection, {
  type FeedbackOption,
} from "@/app/components/workoutSession/SetLoggingSection";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type SetLoggingScreenProps = {
  buttonVariant?: "completeSet" | "completeExercise";
};

const SetLoggingScreen = ({ buttonVariant = "completeSet" }: SetLoggingScreenProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // UI-only dummy state. No persistence, no backend writes.
  const [weight, setWeight] = useState<number>(120);
  const [reps, setReps] = useState<number>(6);
  const [feedback, setFeedback] = useState<string>("correct");
  const [comment, setComment] = useState<string>("");

  const feedbackOptions: FeedbackOption[] = useMemo(
    () => [
      { value: "light", label: t("workout.setLogging.feedback.light") },
      { value: "correct", label: t("workout.setLogging.feedback.correct") },
      { value: "heavy", label: t("workout.setLogging.feedback.heavy") },
    ],
    [t],
  );

  const buttonLabel =
    buttonVariant === "completeExercise"
      ? t("workout.setLogging.actions.completeExercise")
      : t("workout.setLogging.actions.completeSet");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + verticalScale(24),
            paddingBottom: verticalScale(160),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BestSetCard
          label={t("workout.setLogging.bestSet.label")}
          weight={120}
          weightUnit="kg"
          reps={4}
          repsLabel={t("workout.setLogging.bestSet.reps")}
        />

        <View style={styles.setHeader}>
          <Text style={styles.setHeaderEyebrow}>
            {t("workout.setLogging.setEyebrow", { number: 1 })}
          </Text>
        </View>

        <SetLoggingSection
          weight={weight}
          weightUnit={t("workout.setLogging.weightUnit")}
          onWeightChange={setWeight}
          reps={reps}
          onRepsChange={setReps}
          feedback={feedback}
          feedbackOptions={feedbackOptions}
          onFeedbackChange={setFeedback}
          comment={comment}
          onCommentChange={setComment}
          labels={{
            weight: t("workout.setLogging.labels.weight"),
            reps: t("workout.setLogging.labels.reps"),
            feedback: t("workout.setLogging.labels.feedback"),
            commentsPlaceholder: t("workout.setLogging.labels.commentsPlaceholder"),
            micAccessibilityLabel: t("workout.setLogging.labels.micAccessibility"),
            commentsAccessibilityLabel: t("workout.setLogging.labels.commentsAccessibility"),
          }}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + verticalScale(12) },
        ]}
      >
        <SetActionFooter
          buttonLabel={buttonLabel}
          onPrimaryAction={() => undefined}
          onNext={() => undefined}
          nextAccessibilityLabel={t("workout.setLogging.actions.nextAccessibility")}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export default SetLoggingScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(18),
    gap: verticalScale(22),
  },
  setHeader: {
    paddingTop: verticalScale(4),
  },
  setHeaderEyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.primary.dark,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    left: horizontalScale(18),
    right: horizontalScale(18),
    bottom: 0,
    backgroundColor: "transparent",
  },
});
