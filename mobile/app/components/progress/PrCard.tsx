import { FONTS } from "@/app/constants/fonts";
import { useWeightUnit } from "@/app/hooks/useWeightUnit";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const GOLD = "#C9A84C";

export interface PrEntry {
  id: string;
  category: string;
  name: string;
  weightKg: number;
  reps: number;
  dateLabel: string;
  isLatest?: boolean;
  deltaKg?: number;
}

interface PrCardProps {
  entry: PrEntry;
}

const PrCard = ({ entry }: PrCardProps) => {
  const { t } = useTranslation();
  const { format, toDisplay, label } = useWeightUnit();

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.category}>{entry.category}</Text>
          <Text style={styles.name} numberOfLines={2}>
            {entry.name}
          </Text>
        </View>
        <View style={styles.topRight}>
          <View style={styles.latestRow}>
            {entry.isLatest ? <View style={styles.dot} /> : null}
            <Text style={styles.latestLabel}>
              {entry.isLatest ? t("progress.latestPr") : t("progress.prDate")}
            </Text>
          </View>
          <Text style={styles.dateText}>{entry.dateLabel}</Text>
        </View>
      </View>

      <View style={styles.bottomBlock}>
        <View style={styles.weightRow}>
          <Text style={styles.weight}>{format(entry.weightKg)}</Text>
          <Text style={styles.weight}>x</Text>
          <Text style={styles.weight}>{`${entry.reps} reps`}</Text>
        </View>
        {typeof entry.deltaKg === "number" ? (
          <Text style={styles.delta}>
            {t("progress.prDelta", {
              value: toDisplay(entry.deltaKg),
              unit: label,
            })}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export default PrCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    gap: 16,
    alignItems: "center",
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", gap: 20, alignItems: "flex-start", width: "100%" },
  topLeft: { flex: 1, gap: 8, alignItems: "flex-start" },
  topRight: { flex: 1, gap: 8, alignItems: "flex-end", justifyContent: "center" },
  bottomBlock: { gap: 8, alignItems: "flex-start", width: "100%" },
  weightRow: { flexDirection: "row", alignItems: "center", gap: 8, width: "100%" },
  category: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
    lineHeight: 14.4,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: "#F0F0F0",
    lineHeight: 24,
    // Reserve 2 lines so short names ("Squat") occupy the same height as
    // wrapped ones ("Bulgarian Split Squat") → uniform card height, no void.
    minHeight: 48,
  },
  latestRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: GOLD },
  latestLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: GOLD,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  dateText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  weight: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 28.8,
  },
  delta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: GOLD,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
});
