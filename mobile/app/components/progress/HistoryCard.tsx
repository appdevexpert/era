import PlanProgressBar, { type PlanPhase } from "@/app/components/workout/PlanProgressBar";
import { FONTS } from "@/app/constants/fonts";
import { FireGold } from "@/assets/icons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const POSITIVE = "#3DCA7A";

export type DayState = "completed" | "active" | "missed" | "upcoming";

export interface HistoryDay {
  label: string;
  date: string;
  state: DayState;
}

interface HistoryCardProps {
  days: HistoryDay[];
  phases: PlanPhase[];
  streakCount: number;
  personalBestReps: number;
}

// `days` is still accepted (and passed by ProgressScreen) but no longer
// rendered — the weekday/date strip is commented out below.
const HistoryCard = ({ phases, streakCount, personalBestReps }: HistoryCardProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      {/* Weekday + date strip hidden per design — card now shows only the
          phase progress bar + streak row. Kept for easy restore. */}
      {/* <View style={styles.dayRow}>
        {days.map((day) => (
          <View key={day.label} style={styles.dayCol}>
            <Text style={styles.dayLabel}>{day.label}</Text>
            <View
              style={[
                styles.dayPill,
                day.state === "completed" && styles.dayPillCompleted,
                day.state === "active" && styles.dayPillActive,
                day.state === "missed" && styles.dayPillMissed,
              ]}
            >
              <Text
                style={[styles.dayDate, day.state === "completed" && styles.dayDateCompleted]}
              >
                {day.date}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.divider} /> */}

      <PlanProgressBar phases={phases} />

      <View style={styles.divider} />

      <View style={styles.streakRow}>
        <View style={{ gap: 8 }}>
          <Text style={styles.tinyEyebrow}>{t("progress.dayStreakLabel")}</Text>
          <View style={styles.streakValue}>
            <FireGold width={20} height={20} />
            <Text style={styles.statsValueSmall}>{String(streakCount).padStart(2, "0")}</Text>
          </View>
        </View>
        <View style={{ gap: 8, alignItems: "flex-end" }}>
          <Text style={styles.tinyEyebrow}>{t("progress.personalBest")}</Text>
          <Text style={styles.statsValueSmall}>
            {t("progress.personalBestValue", { count: personalBestReps })}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default HistoryCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 12,
    gap: 18,
  },
  dayRow: { flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center", gap: 8 },
  dayLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(240,240,240,0.5)",
    textTransform: "uppercase",
    width: 28,
    textAlign: "center",
  },
  dayPill: {
    width: 36,
    height: 36,
    borderRadius: 76.9,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillCompleted: { backgroundColor: "rgba(61,202,122,0.18)" },
  dayPillActive: { backgroundColor: "#1B1B1B" },
  dayPillMissed: { backgroundColor: "#816D33" },
  dayDate: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: "600",
    color: "#F0F0F0",
  },
  dayDateCompleted: { color: POSITIVE },
  divider: { height: 1, backgroundColor: "rgba(240,240,240,0.1)" },
  streakRow: { flexDirection: "row", justifyContent: "space-between" },
  streakValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  tinyEyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
    lineHeight: 14.4,
  },
  statsValueSmall: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
