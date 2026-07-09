import { FONTS } from "@/app/constants/fonts";
import { useWeightUnit } from "@/app/hooks/useWeightUnit";
import { MedalPrGold } from "@/assets/icons";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

export interface SessionDelta {
  /** Absolute difference vs the previous session — kg or seconds depending on `metricKind`. */
  kg: number;
  positive: boolean;
}

interface SessionHistoryCardProps {
  /** Date eyebrow shown in gold (e.g. "Week 4 • Apr 20"). */
  dateLabel: string;
  weightKg: number;
  reps: number;
  /**
   * "weight" (default) → renders "${weightKg} kg x ${reps} reps" and a "±X kg" delta.
   * "duration" → renders "${durationLabel}" and a "±Xs" delta. Use with `durationLabel`.
   */
  metricKind?: "weight" | "duration";
  /** Pre-formatted duration text shown in duration mode (e.g. "1 min 30 sec"). */
  durationLabel?: string;
  /** When set, renders a `+X kg` / `-X kg` chip on the right (green/red). */
  delta?: SessionDelta;
  /**
   * When set, renders a badge on the right with a soft gold gradient behind it
   * (matches the Figma "PR" / Award variant). Hides any `delta` prop.
   * Pass `true` to use the default PR award badge, or any ReactNode for a custom badge.
   */
  badge?: ReactNode | boolean;
}

const POSITIVE = "#3DCA7A";
const NEGATIVE = "#E67777";

// Default PR badge — purple-ribboned gold medal (Figma "Award 6"). Renders at its natural ~83×44 ratio.
const DefaultBadge = () => <MedalPrGold width={83} height={45} />;

/**
 * Session history row used inside the Exercise History screen.
 * Three modes by precedence:
 *   1. `badge` set → right side shows badge over a gold gradient
 *   2. `delta` set → right side shows green/red `+X kg` text
 *   3. neither   → right side is empty (just the weight/reps line)
 */
const SessionHistoryCard = ({
  dateLabel,
  weightKg,
  reps,
  metricKind = "weight",
  durationLabel,
  delta,
  badge,
}: SessionHistoryCardProps) => {
  const { format, toDisplay, label } = useWeightUnit();
  const showBadge = badge !== undefined && badge !== false && badge !== null;
  const badgeNode = badge === true ? <DefaultBadge /> : (badge as ReactNode);

  const primaryText =
    metricKind === "duration"
      ? (durationLabel ?? "")
      : `${format(weightKg)}  x  ${reps} reps`;

  const deltaUnit = metricKind === "duration" ? "s" : label;
  const deltaValue =
    metricKind === "duration" || !delta ? delta?.kg : toDisplay(delta.kg);

  return (
    <View style={[styles.card, showBadge && styles.cardWithBadge]}>
      {showBadge ? (
        <View style={styles.gradientClip} pointerEvents="none">
          <LinearGradient
            colors={["rgba(17,17,17,0)", "rgba(17,17,17,0)", "rgba(201,168,76,0.30)"]}
            locations={[0, 0.17143, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.badgeGradient}
          />
        </View>
      ) : null}

      <View style={styles.left}>
        <Text style={styles.eyebrow}>{dateLabel}</Text>
        <Text style={styles.weight}>{primaryText}</Text>
      </View>

      {showBadge ? (
        <View style={styles.badgeSlot} pointerEvents="none">{badgeNode}</View>
      ) : delta ? (
        <Text
          style={[styles.delta, { color: delta.positive ? POSITIVE : NEGATIVE }]}
        >
          {`${delta.positive ? "+" : "-"}${deltaValue} ${deltaUnit}`}
        </Text>
      ) : null}
    </View>
  );
};

export default SessionHistoryCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    minHeight: 83,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    overflow: "hidden",
  },
  // Reserve right-side space for the wide gold medal (~83px wide).
  cardWithBadge: {
    paddingRight: 100,
  },
  // Clips the gold gradient to the card's rounded corners since the card itself is overflow:visible.
  gradientClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: "hidden",
  },
  // Gold gradient that fades in from the right (~83% of the way across the card).
  badgeGradient: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 140,
  },
  left: {
    flex: 1,
    gap: 8,
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "#C9A84C",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  weight: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    lineHeight: 28.8,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  delta: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 16.8,
    letterSpacing: 0.56,
    textTransform: "uppercase",
  },
  // Wide gold medal sits centered on the right side of the row (Figma "Award 6", right:3.02 vertically centered).
  badgeSlot: {
    position: "absolute",
    right: 3,
    top: 0,
    bottom: 0,
    width: 83,
    alignItems: "center",
    justifyContent: "center",
  },
});
