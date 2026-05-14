import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export type RestTimerCardProps = {
  /** Current seconds remaining (0..totalSeconds). */
  secondsRemaining: number;
  /** Total seconds for the rest period. Used as the denominator for the ring. */
  totalSeconds: number;
  /** Called when the user taps the `+ 30 sec` extend pill. */
  onExtend?: () => void;
  /** Diameter of the ring in pixels. Defaults to 240. */
  size?: number;
  /** Stroke width of the ring in pixels. Defaults to 10. */
  strokeWidth?: number;
  testID?: string;
};

const DEFAULT_SIZE = 240;
const DEFAULT_STROKE = 10;
const EXTEND_SECONDS = 30;

/**
 * Reusable rest-timer card: circular SVG progress ring driven by Reanimated,
 * large center seconds value, "Seconds" label, and a "+ 30 sec" pill button.
 *
 * The ring tweens smoothly between values rather than stepping once per second.
 * The seconds number is rendered through an animated `TextInput` whose `text`
 * prop is driven by the same shared value, so it stays in sync with the ring
 * without going through the JS thread on every frame.
 */
const RestTimerCard = ({
  secondsRemaining,
  totalSeconds,
  onExtend,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE,
  testID,
}: RestTimerCardProps) => {
  const { t } = useTranslation();
  const safeTotal = Math.max(totalSeconds, 1);
  const safeRemaining = Math.min(Math.max(secondsRemaining, 0), safeTotal);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Shared value tracking the smoothly-animated remaining seconds.
  const animatedRemaining = useSharedValue(safeRemaining);

  useEffect(() => {
    animatedRemaining.value = withTiming(safeRemaining, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedRemaining, safeRemaining]);

  // Ring progress: 0 = full ring drawn, circumference = empty ring.
  const animatedCircleProps = useAnimatedProps(() => {
    const ratio = animatedRemaining.value / safeTotal;
    const clamped = Math.min(Math.max(ratio, 0), 1);
    return {
      strokeDashoffset: circumference * (1 - clamped),
    };
  }, [circumference, safeTotal]);

  // Integer displayed in the center of the ring, derived on the UI thread.
  const displaySeconds = useDerivedValue(() =>
    String(Math.max(0, Math.round(animatedRemaining.value))),
  );

  const animatedTextProps = useAnimatedProps(
    () =>
      ({
        text: displaySeconds.value,
        defaultValue: displaySeconds.value,
      }) as object,
  );

  return (
    <View style={[styles.wrapper, { width: size }]} testID={testID}>
      <View style={[styles.ringWrap, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={COLORS.primary.light} stopOpacity={1} />
              <Stop offset="0.5" stopColor={COLORS.primary.base} stopOpacity={1} />
              <Stop offset="1" stopColor={COLORS.primary.dark} stopOpacity={1} />
            </LinearGradient>
          </Defs>

          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.alpha.white08}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Animated progress arc — starts at 12 o'clock, sweeps clockwise. */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            originX={size / 2}
            originY={size / 2}
            rotation={-90}
            animatedProps={animatedCircleProps}
          />
        </Svg>

        <View style={styles.centerContent} pointerEvents="none">
          <AnimatedTextInput
            accessibilityRole="text"
            accessible={false}
            editable={false}
            allowFontScaling={false}
            underlineColorAndroid="transparent"
            defaultValue={String(Math.round(safeRemaining))}
            style={styles.secondsValue}
            animatedProps={animatedTextProps}
          />
          <Text style={styles.secondsLabel}>
            {t("workout.restTimer.secondsLabel")}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("workout.restTimer.extendAccessibility", {
          seconds: EXTEND_SECONDS,
        })}
        onPress={onExtend}
        style={({ pressed }) => [
          styles.extendButton,
          pressed && styles.extendButtonPressed,
        ]}
      >
        <Text style={styles.extendText}>
          {t("workout.restTimer.extend", { seconds: EXTEND_SECONDS })}
        </Text>
      </Pressable>
    </View>
  );
};

export default RestTimerCard;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 32,
  },
  ringWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  secondsValue: {
    fontFamily: FONTS.display,
    fontSize: 96,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 100,
    textAlign: "center",
    padding: 0,
    minWidth: 140,
    includeFontPadding: false,
  },
  secondsLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.alpha.white72,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  extendButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary60,
    backgroundColor: COLORS.alpha.primary16,
  },
  extendButtonPressed: {
    backgroundColor: COLORS.alpha.primary20,
    opacity: 0.85,
  },
  extendText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary.base,
    letterSpacing: 0.5,
  },
});
