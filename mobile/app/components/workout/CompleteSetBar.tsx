import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { SkipNext } from "@/assets/icons";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

type CompleteSetBarProps = {
  onComplete: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showNext?: boolean;
  showPrevious?: boolean;
  isLastSet?: boolean;
};

const GRADIENT_COLORS = [
  "rgba(201,168,76,0.6)",
  "rgba(247,224,111,0.6)",
  "rgba(252,243,192,0.6)",
] as const;

const GoldButton = ({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style: object;
  children: React.ReactNode;
}) => (
  <Pressable style={style} onPress={onPress}>
    <LinearGradient
      colors={[...GRADIENT_COLORS]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
    <GlassView
      pointerEvents="none"
      glassEffectStyle="regular"
      colorScheme="dark"
      style={styles.glass}
    />
    {children}
  </Pressable>
);

const CompleteSetBar = ({
  onComplete,
  onNext,
  onPrevious,
  showNext = true,
  showPrevious = false,
  isLastSet = false,
}: CompleteSetBarProps) => {
  const { t } = useTranslation();
  const label = isLastSet
    ? t("workout.ui.completeExercise")
    : t("workout.ui.completeSet");

  return (
    <View style={styles.row}>
      {showPrevious && onPrevious ? (
        <GoldButton onPress={onPrevious} style={styles.circleBtn}>
          <SkipNext
            width={24}
            height={24}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </GoldButton>
      ) : null}

      <GoldButton onPress={onComplete} style={styles.mainBtn}>
        <Text style={styles.mainLabel}>{label}</Text>
      </GoldButton>

      {showNext && onNext ? (
        <GoldButton onPress={onNext} style={styles.circleBtn}>
          <SkipNext width={24} height={24} />
        </GoldButton>
      ) : null}
    </View>
  );
};

export default CompleteSetBar;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  mainBtn: {
    flex: 1,
    height: 53,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mainLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.neutral.white,
    textAlign: "center",
    letterSpacing: 0.36,
  },
  circleBtn: {
    width: 53,
    height: 53,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glass: {
    ...StyleSheet.absoluteFillObject,
  }
});
