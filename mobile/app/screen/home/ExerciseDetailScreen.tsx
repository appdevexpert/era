import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import type { CompletedExerciseView, CompletedSetView } from "@/app/types/workout";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { FeedbackLight, FeedbackCorrect, FeedbackHeavy } from "@/assets/icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import type { FC } from "react";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";

const FEEDBACK_LABELS: Record<string, { en: string; nb: string }> = {
  light_weight: { en: "Light Weight", nb: "Lett vekt" },
  correct_weight: { en: "Correct Weight", nb: "Riktig vekt" },
  felt_heavy: { en: "Heavy Weight", nb: "Tung vekt" },
};

const FEEDBACK_ICONS: Record<string, FC<SvgProps>> = {
  light_weight: FeedbackLight,
  correct_weight: FeedbackCorrect,
  felt_heavy: FeedbackHeavy,
};

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SetCard = ({ set, language }: { set: CompletedSetView; language: string }) => {
  const { t } = useTranslation();
  const lang = language.startsWith("nb") ? "nb" : "en";
  const feedbackLabel = set.feedback ? FEEDBACK_LABELS[set.feedback]?.[lang] ?? set.feedback : null;
  const FeedbackIcon = set.feedback ? FEEDBACK_ICONS[set.feedback] ?? null : null;

  return (
    <View style={styles.setCard}>
      {/* Set header row */}
      <View style={styles.setHeaderRow}>
        <View style={styles.setLeft}>
          <Text style={styles.setLabel}>
            {t("workout.ui.setLabel", { number: set.setNumber })}
          </Text>
          <View style={styles.setValueRow}>
            {set.weight != null ? (
              <>
                <Text style={styles.setValue}>{set.weight} {set.weightUnit}</Text>
                <Text style={styles.setX}>x</Text>
                <Text style={styles.setValue}>{set.reps ?? 0} reps</Text>
              </>
            ) : set.duration != null ? (
              <Text style={styles.setValue}>{set.duration} sec</Text>
            ) : (
              <>
                <Text style={styles.setValue}>BW</Text>
                <Text style={styles.setX}>x</Text>
                <Text style={styles.setValue}>{set.reps ?? 0} reps</Text>
              </>
            )}
          </View>
        </View>
        {feedbackLabel ? (
          <View style={styles.feedbackBadge}>
            {FeedbackIcon ? <FeedbackIcon width={24} height={24} /> : null}
            <Text style={styles.feedbackText}>{feedbackLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Comment section */}
      {set.comment ? (
        <>
          <View style={styles.setDivider} />
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>{t("workout.ui.comment")}</Text>
            <Text style={styles.commentText}>{set.comment}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
};

const ExerciseDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "ExerciseDetail">>();
  const { t, i18n } = useTranslation();

  const exercise: CompletedExerciseView | null = useMemo(() => {
    try {
      return JSON.parse(route.params.exerciseData) as CompletedExerciseView;
    } catch {
      return null;
    }
  }, [route.params.exerciseData]);

  if (!exercise) return null;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + verticalScale(130),
            paddingBottom: insets.bottom + 40,
          },
        ]}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard
            value={String(exercise.totalSets)}
            label={t("workout.ui.setsLabel")}
          />
          <StatCard
            value={String(route.params.sessionDurationMinutes || exercise.durationMinutes || "—")}
            label={t("workout.ui.minutesLabel")}
          />
        </View>

        {/* Exercise-level comment (from bottom sheet) */}
        {exercise.comment ? (
          <View style={styles.exerciseCommentCard}>
            <Text style={styles.commentLabel}>{t("workout.ui.comment")}</Text>
            <Text style={styles.commentText}>{exercise.comment}</Text>
          </View>
        ) : null}

        {/* Set cards */}
        {exercise.sets.map((set) => (
          <SetCard key={set.setNumber} set={set} language={i18n.language} />
        ))}
      </ScrollView>
    </View>
  );
};

export default ExerciseDetailScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(16),
    gap: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minHeight: 49,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#111111",
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

  /* Set card */
  setCard: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    gap: 20,
  },
  setHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  setLeft: {
    flex: 1,
    gap: 8,
  },
  setLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
    lineHeight: 14.4,
  },
  setValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  setValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.neutral.white,
    lineHeight: 24,
  },
  setX: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.neutral.white,
    lineHeight: 24,
  },

  /* Feedback badge */
  feedbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedbackText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(240,240,240,0.5)",
    lineHeight: 18.2,
  },

  /* Exercise-level comment card */
  exerciseCommentCard: {
    backgroundColor: "#111111",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },

  /* Divider + comment */
  setDivider: {
    height: 1,
    backgroundColor: "#1E1E1E",
  },
  commentSection: {
    gap: 8,
  },
  commentLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(240,240,240,0.6)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
    lineHeight: 14.4,
  },
  commentText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: "400",
    color: COLORS.neutral.white,
    lineHeight: 19.2,
  },
});
