import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import {
  selectActiveSessionError,
  selectActiveSessionStatus,
  selectActiveWorkoutSession,
} from "@/app/stores/selectors/workoutSelectors";
import { loadWorkoutSession } from "@/app/stores/slice/workoutSlice";
import { useAppDispatch } from "@/app/stores/store";
import type { WorkoutSessionSetView } from "@/app/types/workout";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { formatElapsedTime } from "@/app/utils/workoutFormatters";
import { mapWorkoutSession } from "@/app/utils/workoutMappers";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const SetChip = ({ set }: { set: WorkoutSessionSetView }) => (
  <View style={[styles.setChip, set.isCurrent && styles.setChipActive]}>
    <Text style={[styles.setNumber, set.isCurrent && styles.setNumberActive]}>
      {set.setNumber}
    </Text>
    {set.target ? <Text style={styles.setTarget}>{set.target}</Text> : null}
  </View>
);

const WorkoutSessionScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, "WorkoutSession">>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation();
  const activeSession = useSelector(selectActiveWorkoutSession);
  const activeSessionStatus = useSelector(selectActiveSessionStatus);
  const activeSessionError = useSelector(selectActiveSessionError);
  const [requestedSessionId, setRequestedSessionId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const sessionSnapshot =
    activeSession?.session.id === route.params.sessionId ? activeSession : null;
  const sessionView = useMemo(
    () => sessionSnapshot ? mapWorkoutSession(sessionSnapshot, i18n.language) : null,
    [i18n.language, sessionSnapshot],
  );
  const elapsedSeconds = sessionView
    ? sessionView.initialDurationSeconds +
      Math.max(Math.floor((now - Date.parse(sessionView.startedAt)) / 1000), 0)
    : 0;
  const isLoading = activeSessionStatus === "loading" && !sessionView;
  const isFailed = activeSessionStatus === "failed" && !sessionView;

  useEffect(() => {
    if (
      !sessionSnapshot &&
      activeSessionStatus !== "loading" &&
      requestedSessionId !== route.params.sessionId
    ) {
      setRequestedSessionId(route.params.sessionId);
      dispatch(loadWorkoutSession({ sessionId: route.params.sessionId }));
    }
  }, [
    activeSessionStatus,
    dispatch,
    requestedSessionId,
    route.params.sessionId,
    sessionSnapshot,
  ]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(201,168,76,0.2)", "rgba(10,10,10,0)"]}
        style={styles.topGlow}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>{"<"}</Text>
          <Text style={styles.backText}>{t("workout.session.back")}</Text>
        </Pressable>
        <View style={styles.elapsedPill}>
          <Text style={styles.elapsedLabel}>{t("workout.session.elapsed")}</Text>
          <Text style={styles.elapsedValue}>{formatElapsedTime(elapsedSeconds)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + verticalScale(104),
            paddingBottom: insets.bottom + verticalScale(148),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {sessionView ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.kicker}>{t("workout.session.inProgress")}</Text>
              <Text style={styles.dayHeading}>{sessionView.dayHeading}</Text>
              <Text style={styles.title}>{sessionView.workoutTitle}</Text>
              {sessionView.workoutSubtitle ? (
                <Text style={styles.subtitle}>{sessionView.workoutSubtitle}</Text>
              ) : null}
            </View>

            {sessionView.totalExercises > 0 ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressCopy}>
                  <Text style={styles.progressLabel}>
                    {t("workout.session.exerciseProgress", {
                      current: sessionView.currentPosition,
                      total: sessionView.totalExercises,
                    })}
                  </Text>
                  <Text style={styles.progressPercent}>
                    {Math.round(sessionView.progress * 100)}%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(sessionView.progress * 100, 100)}%` },
                    ]}
                  />
                </View>
              </View>
            ) : null}

            {sessionView.currentExercise ? (
              <View style={styles.exercisePanel}>
                <View style={styles.sectionRow}>
                  {sessionView.currentExercise.sectionTitle ? (
                    <Text style={styles.sectionTitle}>
                      {sessionView.currentExercise.sectionTitle}
                    </Text>
                  ) : null}
                  {sessionView.currentExercise.weight ? (
                    <Text style={styles.weightText}>
                      {sessionView.currentExercise.weight}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.exerciseName}>{sessionView.currentExercise.name}</Text>
                {sessionView.currentExercise.target ? (
                  <Text style={styles.exerciseTarget}>
                    {sessionView.currentExercise.target}
                  </Text>
                ) : null}

                {sessionView.currentExercise.plannedSets.length > 0 ? (
                  <View style={styles.setsBlock}>
                    <Text style={styles.blockLabel}>
                      {t("workout.session.plannedSets")}
                    </Text>
                    <View style={styles.setsRow}>
                      {sessionView.currentExercise.plannedSets.map((set) => (
                        <SetChip key={set.id} set={set} />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{t("workout.session.noExercises")}</Text>
              </View>
            )}

            {sessionView.nextExerciseName ? (
              <View style={styles.nextPanel}>
                <Text style={styles.blockLabel}>{t("workout.session.upNext")}</Text>
                <Text style={styles.nextName}>{sessionView.nextExerciseName}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              {isLoading
                ? t("workout.session.loading")
                : isFailed
                  ? activeSessionError ?? t("workout.session.unableToLoad")
                  : t("workout.session.loading")}
            </Text>
          </View>
        )}
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.96)"]}
        locations={[0, 0.56]}
        style={styles.bottomFade}
      />
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <PrimaryButton
          disabled
          label={t("workout.session.loggingComingNext")}
          onPress={() => undefined}
        />
      </View>
    </View>
  );
};

export default WorkoutSessionScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: horizontalScale(18),
    paddingBottom: 12,
    backgroundColor: "rgba(10,10,10,0.82)",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
  },
  backIcon: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    color: COLORS.primary.dark,
    lineHeight: 20,
  },
  backText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.neutral.white,
    letterSpacing: 0.36,
    textTransform: "uppercase",
  },
  elapsedPill: {
    minWidth: 92,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary20,
    backgroundColor: COLORS.neutral.black3,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    gap: 2,
  },
  elapsedLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.alpha.white72,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  elapsedValue: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 18,
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(18),
    gap: verticalScale(20),
  },
  hero: {
    gap: 8,
  },
  kicker: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.primary.dark,
    letterSpacing: 0.72,
    textTransform: "uppercase",
  },
  dayHeading: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.alpha.white72,
    letterSpacing: 0.52,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 34,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.alpha.white72,
    lineHeight: 20,
  },
  progressBlock: {
    gap: 10,
  },
  progressCopy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  progressPercent: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.alpha.white72,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: COLORS.alpha.white08,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.primary.dark,
  },
  exercisePanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    backgroundColor: COLORS.neutral.black3,
    padding: 18,
    gap: 16,
  },
  sectionRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  weightText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  exerciseName: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 34,
  },
  exerciseTarget: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.alpha.white72,
    lineHeight: 19,
    textTransform: "uppercase",
    letterSpacing: 0.32,
  },
  setsBlock: {
    gap: 12,
  },
  blockLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.alpha.white72,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  setsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  setChip: {
    minWidth: 58,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.alpha.white12,
    backgroundColor: COLORS.alpha.white04,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  setChipActive: {
    borderColor: COLORS.alpha.primary60,
    backgroundColor: COLORS.alpha.primary16,
  },
  setNumber: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  setNumberActive: {
    color: COLORS.primary.light,
  },
  setTarget: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.alpha.white72,
    textAlign: "center",
  },
  nextPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.alpha.white08,
    padding: 16,
    gap: 8,
  },
  nextName: {
    fontFamily: FONTS.medium,
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  statusBox: {
    minHeight: verticalScale(320),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.alpha.white72,
    textAlign: "center",
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 132,
  },
  bottomBar: {
    position: "absolute",
    left: horizontalScale(18),
    right: horizontalScale(18),
    bottom: 0,
  },
});
