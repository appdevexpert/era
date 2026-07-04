import EntitlementGate from "@/app/components/common/EntitlementGate";
import SuccessBanner from "@/app/components/progress/SuccessBanner";
import ProChartLockedCard from "@/app/components/workout/ProChartLockedCard";
import WeightProgressChart, { type ChartPoint } from "@/app/components/workout/WeightProgressChart";
import { FONTS } from "@/app/constants/fonts";
import { useWeightUnit } from "@/app/hooks/useWeightUnit";
import { EditPen } from "@/assets/icons";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";

interface WeightStatsCardProps {
  currentKg: number | null;
  heaviestKg: number | null;
  lightestKg: number | null;
  chartData: ChartPoint[];
  chartXTickLabels?: string[];
  chartYMin: number;
  chartYMax: number;
  chartYStep?: number;
  bmi: number | null;
  heightLabel: string | null;
  bannerText: string;
  onEditHeight?: () => void;
}

const WeightStatsCard = ({
  currentKg,
  heaviestKg,
  lightestKg,
  chartData,
  chartXTickLabels,
  chartYMin,
  chartYMax,
  chartYStep = 1,
  bmi,
  heightLabel,
  bannerText,
  onEditHeight,
}: WeightStatsCardProps) => {
  const { t } = useTranslation();
  const { format } = useWeightUnit();
  const hasExtremes = heaviestKg !== null && lightestKg !== null;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.tinyEyebrow}>{t("progress.weightCurrent")}</Text>
          <Text style={styles.currentValue}>
            {currentKg !== null ? format(currentKg) : "—"}
          </Text>
        </View>
        {hasExtremes ? (
          <View style={{ flex: 1, gap: 8, alignItems: "flex-end" }}>
            <View style={styles.secondaryRow}>
              <Text style={styles.tinyEyebrow}>{t("progress.weightHeaviest")}</Text>
              <Text style={styles.statsValueSmall}>{format(heaviestKg)}</Text>
            </View>
            <View style={styles.secondaryRow}>
              <Text style={styles.tinyEyebrow}>{t("progress.weightLightest")}</Text>
              <Text style={styles.statsValueSmall}>{format(lightestKg)}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.chartBlock}>
        <Text style={styles.chartCaption}>
          {t("progress.weightLast30Days")}
        </Text>
        <WeightProgressChart
          data={chartData}
          xTickLabels={chartXTickLabels}
          yMin={chartYMin}
          yMax={chartYMax}
          yStep={chartYStep}
          pageSize={7}
        />
      </View>

      <SuccessBanner text={bannerText} />

      <View style={styles.bmiRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.tinyEyebrow}>{t("progress.bmi")}</Text>
          <Text style={styles.bmiValue}>{bmi !== null ? bmi : "—"}</Text>
        </View>
        <View style={{ flex: 1, gap: 6, alignItems: "flex-end" }}>
          <Text style={styles.tinyEyebrow}>{t("progress.height")}</Text>
          <PressableScale onPress={onEditHeight} hitSlop={8} style={styles.heightRow}>
            <Text style={styles.heightValue}>{heightLabel ?? "—"}</Text>
            <EditPen width={24} height={24} />
          </PressableScale>
        </View>
      </View>

      {/* Full weight card is Standard+. When locked, the entire card sits
          behind a blurred Upgrade-to-Pro overlay (matches Figma). */}
      <EntitlementGate
        requires="standard"
        fallback={<ProChartLockedCard requiredTier="standard" />}
      >
        {null}
      </EntitlementGate>
    </View>
  );
};

export default WeightStatsCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 24,
    padding: 12,
    gap: 24,
    position: "relative",
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", gap: 8, width: "100%" },
  chartBlock: { gap: 12 },
  chartCaption: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
    lineHeight: 14.4,
  },
  secondaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currentValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 28.8,
  },
  bmiRow: { flexDirection: "row", gap: 8, width: "100%" },
  bmiValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  heightValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  heightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statsValueSmall: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tinyEyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
    lineHeight: 14.4,
  },
});
