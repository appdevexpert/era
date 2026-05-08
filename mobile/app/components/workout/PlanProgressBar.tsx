import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { IconFlag, MedalBadge } from "@/assets/icons";
import { useCallback, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";


// --- Stepper Segment ---

interface StepperSegmentProps {
  progress: number; // 0 to 1
}

const StepperSegment = ({ progress }: StepperSegmentProps) => {
  const [width, setWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const pad = 3; // half of stroke-width (6/2) for round cap
  const lineEnd = Math.max(pad, width - pad);
  const fillEnd = pad + (lineEnd - pad) * progress;

  return (
    <View style={segStyles.segment} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={6} viewBox={`0 0 ${width} 6`}>
          {/* Background track */}
          <Line
            x1={pad}
            y1={3}
            x2={lineEnd}
            y2={3}
            stroke={COLORS.neutral.white}
            strokeOpacity={0.2}
            strokeWidth={6}
            strokeLinecap="round"
          />
          {/* Filled portion with gold gradient */}
          {progress > 0 && (
            <>
              <Defs>
                <LinearGradient id={`grad-${width}`} x1={pad} y1={3} x2={fillEnd} y2={3} gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor={COLORS.primary.light} />
                  <Stop offset="0.5" stopColor={COLORS.primary.base} />
                  <Stop offset="1" stopColor={COLORS.primary.dark} />
                </LinearGradient>
              </Defs>
              <Line
                x1={pad}
                y1={3}
                x2={fillEnd}
                y2={3}
                stroke={`url(#grad-${width})`}
                strokeWidth={6}
                strokeLinecap="round"
              />
            </>
          )}
        </Svg>
      )}
    </View>
  );
};

const segStyles = StyleSheet.create({
  segment: {
    flex: 1,
    height: 6,
  },
});

// --- Main Component ---

export interface PlanPhase {
  label: string;
  active: boolean;
  progress: number;
}

interface PlanProgressBarProps {
  phases?: PlanPhase[];
}

const PlanProgressBar = ({
  phases = [
    { label: "Hypertrophy", active: true, progress: 0.1 },
    { label: "Strength", active: false, progress: 0 },
    { label: "Peak", active: false, progress: 0 },
  ],
}: PlanProgressBarProps) => (
  <View style={styles.container}>
    {/* Progress bar row */}
    <View style={styles.barRow}>
      <IconFlag width={20} height={20} />
      <View style={styles.tracks}>
        {phases.map((phase, i) => (
          <StepperSegment key={i} progress={phase.progress} />
        ))}
      </View>
      <MedalBadge width={20} height={20} />
    </View>

    {/* Labels row */}
    <View style={styles.labelRow}>
      <View style={styles.labelSpacer} />
      {phases.map((phase, i) => (
        <Text
          key={i}
          style={[
            styles.label,
            phase.active ? styles.labelActive : styles.labelInactive,
          ]}
        >
          {phase.label}
        </Text>
      ))}
      <View style={styles.labelSpacer} />
    </View>
  </View>
);

export default PlanProgressBar;

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tracks: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  labelRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  labelSpacer: {
    width: 20,
  },
  label: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: "400",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    lineHeight: 12,
  },
  labelActive: {
    color: COLORS.primary.dark,
  },
  labelInactive: {
    color: COLORS.neutral.white,
    opacity: 0.6,
  },
});
