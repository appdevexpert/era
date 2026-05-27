import ScreenFades from "@/app/components/common/ScreenFades";
import ExercisePrHistoryScreenSkeleton from "@/app/components/skeleton/ExercisePrHistoryScreenSkeleton";
import SessionHistoryCard from "@/app/components/workout/SessionHistoryCard";
import { FONTS } from "@/app/constants/fonts";
import { type HomeStackParamList } from "@/app/navigation/types";
import {
  listExercisePRs,
  type ExercisePRRow,
} from "@/app/services/sessionService";
import type { RootState } from "@/app/stores/store";
import { computeCurrentPosition } from "@/app/utils/programSchedule";
import { useHeaderHeight } from "@react-navigation/elements";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ExercisePrHistoryRoute = RouteProp<HomeStackParamList, "ExercisePrHistory">;

const formatPrDate = (iso: string, language: string) => {
  const d = new Date(iso);
  return d
    .toLocaleDateString(language, { month: "short", day: "2-digit" })
    .replace(".", "");
};

const toLocalYMD = (iso: string) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const ExercisePrHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { t, i18n } = useTranslation();
  const route = useRoute<ExercisePrHistoryRoute>();
  const exerciseId = route.params?.exerciseId ?? null;

  const userId = useSelector((s: RootState) => s.auth.user?.id ?? null);
  const programStartDate = useSelector(
    (s: RootState) => s.auth.programStartDate,
  );
  const totalWeeks = useSelector(
    (s: RootState) => s.workout.overview?.program.duration_weeks ?? 12,
  );

  const [rows, setRows] = useState<ExercisePRRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "succeeded" | "failed">(
    "idle",
  );

  useEffect(() => {
    if (!userId || !exerciseId) return;
    let cancelled = false;
    setStatus("loading");
    listExercisePRs({ userId, exerciseId })
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setStatus("succeeded");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, exerciseId]);

  const sessions = useMemo(() => {
    const config = programStartDate
      ? { programStartDate, totalWeeks }
      : null;

    return rows.map((row, idx) => {
      const datePart = formatPrDate(row.achievedAt, i18n.language);
      let label = datePart;
      if (config) {
        try {
          const { weekNumber } = computeCurrentPosition(
            config,
            toLocalYMD(row.achievedAt),
          );
          label = t("progress.weekLabel", {
            week: weekNumber,
            date: datePart,
            defaultValue: `Week ${weekNumber} • ${datePart}`,
          });
        } catch {
          label = datePart;
        }
      }
      const delta =
        row.previousWeightKg != null && row.previousWeightKg > 0
          ? { kg: Math.max(0, row.weightKg - row.previousWeightKg), positive: true }
          : undefined;
      return {
        id: row.id,
        dateLabel: label,
        weightKg: row.weightKg,
        reps: row.reps ?? 0,
        delta,
        latest: idx === 0,
      };
    });
  }, [rows, programStartDate, totalWeeks, i18n.language, t]);

  const [latest, ...past] = sessions;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 120 },
        ]}
      >
        {status === "loading" && rows.length === 0 ? (
          <ExercisePrHistoryScreenSkeleton />
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {t("progress.prHistory.sectionTitle")}
            </Text>

            {sessions.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  {t("progress.prHistory.emptyTitle")}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {t("progress.prHistory.emptySubtitle")}
                </Text>
              </View>
            ) : (
              <>
                <SessionHistoryCard
                  dateLabel={latest.dateLabel}
                  weightKg={latest.weightKg}
                  reps={latest.reps}
                  delta={latest.delta}
                  badge
                />

                {past.length > 0 ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.pastList}>
                      {past.map((session) => (
                        <View key={session.id} style={styles.dimWrap}>
                          <SessionHistoryCard
                            dateLabel={session.dateLabel}
                            weightKg={session.weightKg}
                            reps={session.reps}
                          />
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>

      <ScreenFades hideTop />
    </View>
  );
};

export default ExercisePrHistoryScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scrollContent: { paddingHorizontal: 16, gap: 16 },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(240,240,240,0.1)",
  },
  pastList: { gap: 16 },
  dimWrap: { opacity: 0.6 },
  empty: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 24,
    gap: 8,
    alignItems: "center",
    marginTop: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: "#F0F0F0",
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: "rgba(240,240,240,0.5)",
    textAlign: "center",
  },
});
