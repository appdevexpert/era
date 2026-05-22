import { FONTS } from "@/app/constants/fonts";
import { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";
import { type SvgProps } from "react-native-svg";

interface PointsRewardCardProps {
  /** Icon component to render inside the gold circle. */
  Icon: ComponentType<SvgProps>;
  /** Pixel size of the icon (matches the per-icon size in Figma). */
  iconSize: number;
  /** Green points label — e.g. "+100 Points", "+15 Points per set". */
  pointsLabel: string;
  /** White description — e.g. "Set a Personal Record". */
  description: string;
  /** Use the warmer dark background for streak/bonus rows. */
  warm?: boolean;
}

/**
 * Single reward row used inside the "How to Optimise your Points" bottom sheet.
 * Matches Figma node 5301:4713 (and its 8 siblings) exactly: dark `#181818`
 * card, 52px gold-tinted circular icon slot, green eyebrow + white description.
 */
const PointsRewardCard = ({
  Icon,
  iconSize,
  pointsLabel,
  description,
  warm = false,
}: PointsRewardCardProps) => (
  <View style={styles.card}>
    <View style={[styles.iconCircle, warm && styles.iconCircleWarm]}>
      <Icon width={iconSize} height={iconSize} />
    </View>
    <View style={styles.textBlock}>
      <Text style={styles.pointsLabel}>{pointsLabel}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  </View>
);

export default PointsRewardCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#181818",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 162.5,
    backgroundColor: "rgba(201,168,76,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconCircleWarm: {
    backgroundColor: "#272318",
  },
  textBlock: {
    flex: 1,
    gap: 6,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  pointsLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 16.8,
    color: "#3DCA7A",
    letterSpacing: 0.56,
    textTransform: "uppercase",
  },
  description: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    lineHeight: 21.6,
    fontWeight: "500",
    color: "#F0F0F0",
  },
});
