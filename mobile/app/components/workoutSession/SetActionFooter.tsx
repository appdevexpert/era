import { COLORS } from "@/app/constants/colors";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export type SetActionFooterVariant = "first" | "middle" | "final";

export type SetActionFooterProps = {
  buttonLabel: string;
  variant?: SetActionFooterVariant;
  onPrimaryAction: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  isPrevDisabled?: boolean;
  isNextDisabled?: boolean;
  disabled?: boolean;
  loading?: boolean;
  prevAccessibilityLabel?: string;
  nextAccessibilityLabel: string;
  primaryTestID?: string;
  prevTestID?: string;
  nextTestID?: string;
};

type ArrowDirection = "prev" | "next";

const ARROW_PATHS: Record<ArrowDirection, string> = {
  next: "M5 12h13M13 6l6 6-6 6",
  prev: "M19 12H6M11 6l-6 6 6 6",
};

const ArrowIcon = ({
  direction,
  size = 22,
  color = COLORS.neutral.white,
}: {
  direction: ArrowDirection;
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d={ARROW_PATHS[direction]}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SetActionFooter = ({
  buttonLabel,
  variant = "first",
  onPrimaryAction,
  onPrev,
  onNext,
  isPrevDisabled,
  isNextDisabled,
  disabled = false,
  loading = false,
  prevAccessibilityLabel,
  nextAccessibilityLabel,
  primaryTestID,
  prevTestID,
  nextTestID,
}: SetActionFooterProps) => {
  const prevDisabled = isPrevDisabled ?? (variant === "first" || !onPrev);
  const nextDisabled = isNextDisabled ?? (variant === "final" || !onNext);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={prevAccessibilityLabel}
        accessibilityState={{ disabled: prevDisabled }}
        onPress={prevDisabled ? undefined : onPrev}
        disabled={prevDisabled}
        hitSlop={8}
        style={({ pressed }) => [
          styles.arrowButton,
          pressed && !prevDisabled && styles.arrowButtonPressed,
          prevDisabled && styles.arrowButtonDisabled,
        ]}
        testID={prevTestID}
      >
        <ArrowIcon direction="prev" />
      </Pressable>
      <View style={styles.primaryWrapper} testID={primaryTestID}>
        <PrimaryButton
          label={buttonLabel}
          onPress={onPrimaryAction}
          disabled={disabled}
          loading={loading}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nextAccessibilityLabel}
        accessibilityState={{ disabled: nextDisabled }}
        onPress={nextDisabled ? undefined : onNext}
        disabled={nextDisabled}
        hitSlop={8}
        style={({ pressed }) => [
          styles.arrowButton,
          pressed && !nextDisabled && styles.arrowButtonPressed,
          nextDisabled && styles.arrowButtonDisabled,
        ]}
        testID={nextTestID}
      >
        <ArrowIcon direction="next" />
      </Pressable>
    </View>
  );
};

export default SetActionFooter;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryWrapper: {
    flex: 1,
  },
  arrowButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.alpha.primary16,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary20,
  },
  arrowButtonPressed: {
    opacity: 0.7,
  },
  arrowButtonDisabled: {
    opacity: 0.35,
    backgroundColor: COLORS.alpha.white08,
    borderColor: COLORS.alpha.white12,
  },
});
