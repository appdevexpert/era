import GlassFill from "@/app/components/common/GlassFill";
import PressableScale from "@/app/components/common/PressableScale";
import TintButton from "@/app/components/common/TintButton";
import { SkipNext } from "@/assets/icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

type CompleteSetBarProps = {
  onComplete: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showNext?: boolean;
  showPrevious?: boolean;
  isLastSet?: boolean;
  /** When paused (break time), dim the bar and block logging. */
  paused?: boolean;
};

const GRADIENT_COLORS = ["#FCF3C0", "#F7E06F", "#C9A84C"] as const;

const GoldButton = ({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style: object;
  children: React.ReactNode;
}) => (
  <PressableScale style={style} onPress={onPress}>
    <LinearGradient
      colors={[...GRADIENT_COLORS]}
      start={{ x: 1, y: 0.5 }}
      end={{ x: 0, y: 0.5 }}
      style={StyleSheet.absoluteFill}
    />
    <GlassFill />
    {children}
  </PressableScale>
);

const CompleteSetBar = ({
  onComplete,
  onNext,
  onPrevious,
  showNext = true,
  showPrevious = false,
  isLastSet = false,
  paused = false,
}: CompleteSetBarProps) => {
  const { t } = useTranslation();
  const label = isLastSet
    ? t("workout.ui.completeExercise")
    : t("workout.ui.completeSet");

  return (
    <View
      style={[styles.row, paused && styles.dimmed]}
      pointerEvents={paused ? "none" : "auto"}
    >
      {showPrevious && onPrevious ? (
        <GoldButton onPress={onPrevious} style={styles.circleBtn}>
          <SkipNext
            width={24}
            height={24}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </GoldButton>
      ) : null}

      <TintButton
        label={label}
        onPress={onComplete}
        variant="gold"
        style={styles.mainBtn}
        disabled={paused}
      />

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
  dimmed: {
    opacity: 0.8,
  },
  mainBtn: {
    flex: 1,
    height: 53,
    paddingVertical: 0,
  },
  circleBtn: {
    width: 53,
    height: 53,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
