import SuccessBanner from "@/app/components/progress/SuccessBanner";
import WeightProgressChart, { type ChartPoint } from "@/app/components/workout/WeightProgressChart";
import { FONTS } from "@/app/constants/fonts";
import { EditPen } from "@/assets/icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  const hasExtremes = heaviestKg !== null && lightestKg !== null;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.tinyEyebrow}>{t("progress.weightCurrent")}</Text>
          <Text style={styles.currentValue}>
            {currentKg !== null ? `${currentKg} kg` : "—"}
          </Text>
        </View>
        {hasExtremes ? (
          <View style={{ flex: 1, gap: 8, alignItems: "flex-end" }}>
            <View style={styles.secondaryRow}>
              <Text style={styles.tinyEyebrow}>{t("progress.weightHeaviest")}</Text>
              <Text style={styles.statsValueSmall}>{`${heaviestKg} kg`}</Text>
            </View>
            <View style={styles.secondaryRow}>
              <Text style={styles.tinyEyebrow}>{t("progress.weightLightest")}</Text>
              <Text style={styles.statsValueSmall}>{`${lightestKg} kg`}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <WeightProgressChart
        data={chartData}
        xTickLabels={chartXTickLabels}
        yMin={chartYMin}
        yMax={chartYMax}
        yStep={chartYStep}
        pageSize={5}
      />

      <SuccessBanner text={bannerText} />

      <View style={styles.bmiRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.tinyEyebrow}>{t("progress.bmi")}</Text>
          <Text style={styles.bmiValue}>{bmi !== null ? bmi : "—"}</Text>
        </View>
        <View style={{ flex: 1, gap: 6, alignItems: "flex-end" }}>
          <Text style={styles.tinyEyebrow}>{t("progress.height")}</Text>
          <Pressable onPress={onEditHeight} hitSlop={8} style={styles.heightRow}>
            <Text style={styles.heightValue}>{heightLabel ?? "—"}</Text>
            <EditPen width={24} height={24} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default WeightStatsCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 12,
    gap: 24,
    //alignItems: "center",
  },
  topRow: { flexDirection: "row", gap: 8, width: "100%" },
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
