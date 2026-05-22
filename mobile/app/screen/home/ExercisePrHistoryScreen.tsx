import ScreenFades from "@/app/components/common/ScreenFades";
import SessionHistoryCard from "@/app/components/workout/SessionHistoryCard";
import { FONTS } from "@/app/constants/fonts";
import { useHeaderHeight } from "@react-navigation/elements";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PrSession {
  id: string;
  dateLabel: string;
  weightKg: number;
  reps: number;
  delta?: { kg: number; positive: boolean };
  /** Latest PR — renders with a gold gradient + medal badge and no dimming. */
  latest?: boolean;
}

const PR_SESSIONS: PrSession[] = [
  { id: "1", dateLabel: "Week 4 • Apr 20", weightKg: 145, reps: 4, delta: { kg: 5, positive: true }, latest: true },
  { id: "2", dateLabel: "Week 4 • Apr 12", weightKg: 140, reps: 4 },
  { id: "3", dateLabel: "Week 3 • Mar 30", weightKg: 125, reps: 4 },
  { id: "4", dateLabel: "Week 4 • Apr 6",  weightKg: 130, reps: 4 },
  { id: "5", dateLabel: "Week 5 • Apr 13", weightKg: 135, reps: 4 },
  { id: "6", dateLabel: "Week 6 • Apr 20", weightKg: 140, reps: 4 },
];

const ExercisePrHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation();

  const [latest, ...past] = PR_SESSIONS;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <Text style={styles.sectionTitle}>{t("progress.prHistory.sectionTitle")}</Text>

        {/* Best / latest PR — highlighted card with badge */}
        <SessionHistoryCard
          dateLabel={latest.dateLabel}
          weightKg={latest.weightKg}
          reps={latest.reps}
          delta={latest.delta}
          badge={latest.latest ? true : undefined}
        />

        {/* Divider between best PR and history list */}
        <View style={styles.divider} />

        {/* Past PRs — dimmed, no badge / delta */}
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
  // Past PRs render at 60% opacity per the Figma's `opacity-60` cards.
  dimWrap: { opacity: 0.6 },
});
