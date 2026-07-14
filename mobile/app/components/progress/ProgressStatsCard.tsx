import { FONTS } from "@/app/constants/fonts";
import { ProgressStatsBg } from "@/assets/images";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Line, Polyline } from "react-native-svg";

export interface ProgressStatItem {
  value: string | number;
  label: string;
  /** When set, the tile becomes tappable and shows the ↗ arrow as a button. */
  onPress?: () => void;
}

interface ProgressStatsCardProps {
  /** Card heading — e.g. "Your Progress". */
  title: string;
  /** First two stats sit side-by-side; any extra stats stack full-width below. */
  stats: ProgressStatItem[];
}

// Matches Figma rgba(240,240,240,0.88) used for the value, label and arrow.
const CONTENT_TINT = "rgba(240,240,240,0.88)";

/** Small up-right arrow (↗) drawn inline to avoid adding an asset. */
const ArrowUpRight = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Line
      x1={7}
      y1={17}
      x2={17}
      y2={7}
      stroke={CONTENT_TINT}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
    <Polyline
      points="8,7 17,7 17,16"
      stroke={CONTENT_TINT}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const StatTile = ({
  stat,
  style,
}: {
  stat: ProgressStatItem;
  style?: object;
}) => {
  const content = (
    <>
      <View style={styles.tileText}>
        <Text style={styles.value}>{stat.value}</Text>
        <Text style={styles.label}>{stat.label}</Text>
      </View>
      <View style={styles.arrowCircle}>
        <ArrowUpRight />
      </View>
    </>
  );

  if (stat.onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.tile,
          style,
          pressed && styles.tilePressed,
        ]}
        onPress={stat.onPress}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.tile, style]}>{content}</View>;
};

/**
 * Top "Your Progress" card on the Progress screen (Figma 7134:35493).
 * Gold-swirl background image with a 24% black overlay, 16px radius. Inside:
 * a card title, then the first two stats side-by-side, then any remaining
 * stats stacked full-width. Each stat is a translucent tile with a big value,
 * a small label, and an ↗ arrow button in the top-right.
 */
const ProgressStatsCard = ({ title, stats }: ProgressStatsCardProps) => {
  const [first, second, ...rest] = stats;

  return (
    <ImageBackground
      source={ProgressStatsBg}
      resizeMode="cover"
      imageStyle={styles.bgImage}
      style={styles.card}
    >
      <View style={styles.overlay} pointerEvents="none" />
      <Text style={styles.title}>{title}</Text>

      <View style={styles.topRow}>
        {first ? <StatTile stat={first} style={styles.flexTile} /> : null}
        {second ? <StatTile stat={second} style={styles.flexTile} /> : null}
      </View>

      {rest.map((stat) => (
        <StatTile key={stat.label} stat={stat} style={styles.fullTile} />
      ))}
    </ImageBackground>
  );
};

export default ProgressStatsCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    padding: 12,
    gap: 12,
  },
  bgImage: {
    borderRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.24)",
    borderRadius: 16,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: "#F0F0F0",
  },
  topRow: {
    flexDirection: "row",
    gap: 12,
  },
  tile: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  tilePressed: {
    opacity: 0.7,
  },
  flexTile: {
    flex: 1,
  },
  fullTile: {
    width: "100%",
    minHeight: 84,
  },
  tileText: {
    flex: 1,
    gap: 4,
  },
  value: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 33.6,
    color: CONTENT_TINT,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: "600",
    color: CONTENT_TINT,
  },
  arrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
});
