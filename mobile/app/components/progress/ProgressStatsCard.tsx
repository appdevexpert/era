import { FONTS } from "@/app/constants/fonts";
import { ProgressStatsBg } from "@/assets/images";
import { ComponentType } from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { type SvgProps } from "react-native-svg";

export interface ProgressStatItem {
  Icon: ComponentType<SvgProps>;
  iconSize?: number;
  value: string | number;
  label: string;
}

interface ProgressStatsCardProps {
  stats: ProgressStatItem[];
}

// Tint passed to each icon via `currentColor` (matches Figma rgba(240,240,240,0.88)).
const ICON_TINT = "#F0F0F0E0";

/**
 * Top stats banner shown on the Progress screen.
 * Uses the gold-swirl background image from Figma 5724:6008 with a 24%
 * black overlay, rounded 24px, and `stats` columns separated by vertical
 * dividers. Each column = icon + 28px bold value + 12px semibold label.
 */
const ProgressStatsCard = ({ stats }: ProgressStatsCardProps) => (
  <ImageBackground
    source={ProgressStatsBg}
    resizeMode="cover"
    imageStyle={styles.bgImage}
    style={styles.card}
  >
    <View style={styles.overlay} pointerEvents="none" />
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <View key={stat.label} style={styles.rowCell}>
          <View style={styles.col}>
            <stat.Icon
              width={stat.iconSize ?? 24}
              height={stat.iconSize ?? 24}
              color={ICON_TINT}
            />
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
          {i < stats.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </View>
  </ImageBackground>
);

export default ProgressStatsCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    padding: 16,
    minHeight: 110,
  },
  bgImage: {
    borderRadius: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.24)",
    borderRadius: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  rowCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  col: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 33.6,
    color: "rgba(240,240,240,0.88)",
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(240,240,240,0.88)",
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
