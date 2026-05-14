import { COLORS } from "@/app/constants/colors";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export type SetActionFooterProps = {
  buttonLabel: string;
  onPrimaryAction: () => void;
  onNext?: () => void;
  disabled?: boolean;
  loading?: boolean;
  nextAccessibilityLabel: string;
  primaryTestID?: string;
  nextTestID?: string;
};

const NextArrowIcon = ({ size = 22, color = COLORS.neutral.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12h13M13 6l6 6-6 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SetActionFooter = ({
  buttonLabel,
  onPrimaryAction,
  onNext,
  disabled = false,
  loading = false,
  nextAccessibilityLabel,
  primaryTestID,
  nextTestID,
}: SetActionFooterProps) => {
  return (
    <View style={styles.row}>
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
        onPress={onNext}
        disabled={!onNext}
        hitSlop={8}
        style={({ pressed }) => [
          styles.nextButton,
          pressed && styles.nextButtonPressed,
          !onNext && styles.nextButtonDisabled,
        ]}
        testID={nextTestID}
      >
        <NextArrowIcon />
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
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.alpha.primary16,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary20,
  },
  nextButtonPressed: {
    opacity: 0.7,
  },
  nextButtonDisabled: {
    opacity: 0.45,
  },
});
