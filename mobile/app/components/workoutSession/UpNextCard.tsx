import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { ChevronRight } from "@/assets/icons";
import { GlassView } from "expo-glass-effect";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export type UpNextCardProps = {
  /** Name of the upcoming exercise. */
  exerciseName: string;
  /** Set progress copy for the upcoming exercise, e.g. `2/3 SET`. */
  setInfo: string;
  /** Tap handler for the skip arrow. In UI-only phase this should be a no-op. */
  onSkip?: () => void;
  /** Accessibility label override for the skip arrow. */
  skipAccessibilityLabel?: string;
  testID?: string;
};

const UpNextCard = ({
  exerciseName,
  setInfo,
  onSkip,
  skipAccessibilityLabel,
  testID,
}: UpNextCardProps) => {
  const { t } = useTranslation();
  const skipLabel =
    skipAccessibilityLabel ?? t("workout.restTimer.skipAccessibility");

  return (
    <View style={styles.wrapper} testID={testID}>
      <GlassView
        pointerEvents="none"
        glassEffectStyle="clear"
        colorScheme="dark"
        style={styles.glass}
      />
      <View style={styles.content}>
        <View style={styles.textColumn}>
          <Text style={styles.eyebrow}>
            {t("workout.restTimer.upNextEyebrow")}
          </Text>
          <Text numberOfLines={1} style={styles.exerciseName}>
            {exerciseName}
          </Text>
          <Text style={styles.setInfo}>{setInfo}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={skipLabel}
          hitSlop={8}
          onPress={onSkip}
          style={({ pressed }) => [
            styles.skipButton,
            pressed && styles.skipButtonPressed,
          ]}
        >
          <ChevronRight width={20} height={20} />
        </Pressable>
      </View>
    </View>
  );
};

export default UpNextCard;

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.alpha.white12,
  },
  glass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  textColumn: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.primary.dark,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  exerciseName: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 26,
  },
  setInfo: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.alpha.white72,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  skipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.alpha.white08,
    borderWidth: 1,
    borderColor: COLORS.alpha.white12,
  },
  skipButtonPressed: {
    backgroundColor: COLORS.alpha.white12,
    opacity: 0.85,
  },
});
