import EntitlementGate from "@/app/components/common/EntitlementGate";
import ScreenFades from "@/app/components/common/ScreenFades";
import ExerciseHistoryScreenSkeleton from "@/app/components/skeleton/ExerciseHistoryScreenSkeleton";
import SessionHistoryCard from "@/app/components/workout/SessionHistoryCard";
import ProChartLockedCard from "@/app/components/workout/ProChartLockedCard";
import WeightProgressChart, { type ChartPoint } from "@/app/components/workout/WeightProgressChart";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { useExerciseHistory } from "@/app/hooks/useExerciseHistory";
import { useWeightUnit } from "@/app/hooks/useWeightUnit";
import type {
  ExerciseHistoryView,
  ExerciseHistoryWeekSection,
  ExerciseMetricKind,
} from "@/app/types/workout";
import { type HomeStackParamList } from "@/app/navigation/types";
import { formatDuration } from "@/app/utils/workoutFormatters";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const POSITIVE = "#3DCA7A";

// Picks a "nice" step that keeps the y-axis between ~4 and ~7 ticks regardless
// of whether the values are kg (small range) or seconds (could be 0–1200).
const pickStep = (range: number, defaultStep: number): number => {
  if (range <= 0) return defaultStep;
  const candidates = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200];
  for (const c of candidates) {
    if (range / c <= 6) return c;
  }
  return 1200;
};

const StatsCard = ({
  stats,
  metricKind,
  chart,
  xTickLabels,
  successMessage,
  labels,
  chartUnit,
  language,
  formatWeightStat,
}: {
  stats: ExerciseHistoryView["stats"];
  metricKind: ExerciseMetricKind;
  chart: ChartPoint[];
  xTickLabels: string[];
  successMessage: string;
  labels: { current: string; heaviest: string; lightest: string };
  chartUnit: string;
  language: string;
  formatWeightStat: (kg: number | null) => string;
}) => {
  // Chart Y-axis snaps to a tidy gridline so kg and seconds both look balanced.
  const { yMin, yMax, yStep } = useMemo(() => {
    if (chart.length === 0) {
      return metricKind === "duration"
        ? { yMin: 0, yMax: 60, yStep: 15 }
        : { yMin: 0, yMax: 20, yStep: 5 };
    }
    const values = chart.map((p) => p.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const defaultStep = metricKind === "duration" ? 15 : 5;
    const step = pickStep(dataMax - dataMin || defaultStep * 4, defaultStep);
    let lo = Math.floor((dataMin - step / 2) / step) * step;
    let hi = Math.ceil((dataMax + step / 2) / step) * step;
    const minSpan = step * 4;
    if (hi - lo < minSpan) {
      const expand = (minSpan - (hi - lo)) / 2;
      lo = Math.max(0, lo - Math.ceil(expand / step) * step);
      hi = lo + minSpan;
    }
    return { yMin: Math.max(0, lo), yMax: hi, yStep: step };
  }, [chart, metricKind]);

  const formatStat = (kg: number | null, sec: number | null): string => {
    if (metricKind === "duration") {
      return sec != null ? formatDuration(sec, language) : "—";
    }
    return formatWeightStat(kg);
  };

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsTopRow}>
        <View style={styles.statsCurrent}>
          <Text style={styles.statsLabel}>{labels.current}</Text>
          <Text style={styles.statsValue}>
            {formatStat(stats.currentKg, stats.currentSec)}
          </Text>
        </View>
        <View style={styles.statsSecondary}>
          <View style={styles.statsSecondaryRow}>
            <Text style={styles.statsLabel}>{labels.heaviest}</Text>
            <Text style={styles.statsSecondaryValue}>
              {formatStat(stats.heaviestKg, stats.longestSec)}
            </Text>
          </View>
          <View style={styles.statsSecondaryRow}>
            <Text style={styles.statsLabel}>{labels.lightest}</Text>
            <Text style={styles.statsSecondaryValue}>
              {formatStat(stats.lightestKg, stats.shortestSec)}
            </Text>
          </View>
        </View>
      </View>

      {/* 12-week progression chart per exercise is Pro-only. Standard users
          still see the session history list below; only the chart is gated. */}
      <EntitlementGate requires="pro" fallback={<ProChartLockedCard />}>
        {chart.length > 0 ? (
          <WeightProgressChart
            data={chart}
            xTickLabels={xTickLabels}
            yMin={yMin}
            yMax={yMax}
            yStep={yStep}
            unit={chartUnit}
          />
        ) : null}
      </EntitlementGate>

      <View style={styles.successBanner}>
        <Text style={styles.successText}>{successMessage}</Text>
      </View>
    </View>
  );
};

const DashedTimeline = () => (
  <Svg width={2} height="100%" style={styles.weekTimeline}>
    <Path
      d="M 1 0 L 1 10000"
      stroke="white"
      strokeOpacity={0.24}
      strokeWidth={2}
      strokeDasharray="8 8"
    />
  </Svg>
);

const WeekBlock = ({
  section,
  isLast,
  metricKind,
  language,
}: {
  section: ExerciseHistoryWeekSection;
  isLast: boolean;
  metricKind: ExerciseMetricKind;
  language: string;
}) => (
  <View style={styles.weekBlock}>
    <View style={styles.weekHeader}>
      <Text style={styles.weekTitle}>{section.weekLabel}</Text>
      <Text style={styles.weekMonth}>{section.monthLabel}</Text>
    </View>
    <View style={styles.weekEntries}>
      {!isLast ? <DashedTimeline /> : null}
      <View style={styles.weekEntryList}>
        {section.entries.map((e) => (
          <SessionHistoryCard
            key={e.id}
            dateLabel={e.dateLabel}
            weightKg={e.weightKg}
            reps={e.reps}
            metricKind={metricKind}
            durationLabel={
              metricKind === "duration" && e.durationSec != null
                ? formatDuration(e.durationSec, language)
                : undefined
            }
            delta={e.delta}
            badge={e.isPR}
          />
        ))}
      </View>
    </View>
  </View>
);

const ExerciseHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { t, i18n } = useTranslation();
  const route = useRoute<RouteProp<HomeStackParamList, "ExerciseHistory">>();
  const exerciseId = route.params?.exerciseId;
  const exerciseName = route.params?.title ?? "";
  const eyebrow = route.params?.subtitle ?? "";

  const { data, loading, error } = useExerciseHistory({
    exerciseId,
    exerciseName,
  });

  const { format: formatKg, toDisplay: kgToDisplayUnit, label: weightUnitLabel } = useWeightUnit();

  const metricKind: ExerciseMetricKind = data?.metricKind ?? "weight";

  const chartData: ChartPoint[] = useMemo(() => {
    const raw = data?.chart.points ?? [];
    if (metricKind === "duration") {
      return raw.map((c) => ({ label: c.label, value: c.value, isReal: c.isReal }));
    }
    return raw.map((c) => ({
      label: c.label,
      value: kgToDisplayUnit(c.value),
      isReal: c.isReal,
    }));
  }, [data, metricKind, kgToDisplayUnit]);

  const xTickLabels = data?.chart.xTickLabels ?? [];
  const chartUnit =
    metricKind === "duration"
      ? t("history.chartUnitSec")
      : weightUnitLabel.toUpperCase();
  const formatWeightStat = (kg: number | null) => (kg != null ? formatKg(kg) : "—");
  const labels =
    metricKind === "duration"
      ? {
          current: t("history.stats.current"),
          heaviest: t("history.stats.longest"),
          lightest: t("history.stats.shortest"),
        }
      : {
          current: t("history.stats.current"),
          heaviest: t("history.stats.heaviest"),
          lightest: t("history.stats.lightest"),
        };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {data && data.totalSessions > 0 ? (
          <>
            <StatsCard
              stats={data.stats}
              metricKind={metricKind}
              chart={chartData}
              xTickLabels={xTickLabels}
              successMessage={t("history.successBanner")}
              labels={labels}
              chartUnit={chartUnit}
              language={i18n.language}
              formatWeightStat={formatWeightStat}
            />

            <View style={styles.historyHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyEyebrow}>{exerciseName || eyebrow}</Text>
                <Text style={styles.historyTitle}>{t("history.sessionHistory")}</Text>
              </View>
              <Text style={styles.historyCount}>
                {t("history.sessionsCount", { count: data.totalSessions })}
              </Text>
            </View>

            <View style={styles.weekList}>
              {data.sections.map((section, idx) => (
                <WeekBlock
                  key={section.id}
                  section={section}
                  isLast={idx === data.sections.length - 1}
                  metricKind={metricKind}
                  language={i18n.language}
                />
              ))}
            </View>
          </>
        ) : loading ? (
          <ExerciseHistoryScreenSkeleton />
        ) : (
          <View style={styles.statusBox}>
            {error ? (
              <Text style={styles.statusText}>{t("history.error")}</Text>
            ) : (
              <>
                <Text style={styles.statusTitle}>{t("history.empty.title")}</Text>
                <Text style={styles.statusText}>{t("history.empty.subtitle")}</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <ScreenFades hideTop bottomExtra={80} />
    </View>
  );
};

export default ExerciseHistoryScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 24,
  },

  statsCard: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 12,
    gap: 24,
    alignItems: "center",
  },
  statsTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
  },
  statsCurrent: {
    flex: 1,
    gap: 8,
  },
  statsSecondary: {
    flex: 1,
    gap: 8,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  statsSecondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  statsValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    lineHeight: 28.8,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statsSecondaryValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    lineHeight: 19.2,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  successBanner: {
    backgroundColor: "rgba(61,202,122,0.08)",
    borderWidth: 1,
    borderColor: "rgba(61,202,122,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: "100%",
  },
  successText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: POSITIVE,
  },

  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  historyEyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  historyTitle: {
    marginTop: 6,
    fontFamily: FONTS.display,
    fontSize: 24,
    lineHeight: 28.8,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  historyCount: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.8)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },

  weekList: {
    gap: 24,
  },
  weekBlock: {
    gap: 24,
  },
  weekHeader: {
    gap: 6,
  },
  weekTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  weekMonth: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  weekEntries: {
    position: "relative",
    paddingLeft: 25,
  },
  weekTimeline: {
    position: "absolute",
    left: 9,
    top: 0,
    bottom: 0,
  },
  weekEntryList: {
    gap: 16,
  },

  statusBox: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  statusTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    lineHeight: 22,
    color: "#F0F0F0",
    textAlign: "center",
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(240,240,240,0.72)",
    textAlign: "center",
  },
});
