import PressableScale from "@/app/components/common/PressableScale";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface SegmentedPillProps {
  leftLabel: string;
  rightLabel: string;
  /** 0 = left selected, 1 = right selected */
  selectedIndex: 0 | 1;
  onChange?: (i: 0 | 1) => void;
}

const TRACK_WIDTH = 128;
const TRACK_HEIGHT = 32;
const PILL_WIDTH = TRACK_WIDTH / 2;
const RIGHT_OFFSET = TRACK_WIDTH - PILL_WIDTH;

const TIMING = {
  duration: 260,
  easing: Easing.bezier(0.32, 0.72, 0.0, 1.0),
} as const;

const SegmentedPill = ({
  leftLabel,
  rightLabel,
  selectedIndex,
  onChange,
}: SegmentedPillProps) => {
  const offset = useSharedValue(selectedIndex === 0 ? 0 : RIGHT_OFFSET);

  useEffect(() => {
    offset.value = withTiming(
      selectedIndex === 0 ? 0 : RIGHT_OFFSET,
      TIMING,
    );
  }, [selectedIndex, offset]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const handleToggle = () => onChange?.(selectedIndex === 0 ? 1 : 0);

  return (
    <PressableScale onPress={handleToggle} style={styles.track}>
      <Animated.View style={[styles.pill, pillStyle]} />
      <View style={styles.half} pointerEvents="none">
        <Text style={styles.label}>{leftLabel}</Text>
      </View>
      <View style={styles.half} pointerEvents="none">
        <Text style={styles.label}>{rightLabel}</Text>
      </View>
    </PressableScale>
  );
};

export default SegmentedPill;

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    backgroundColor: "rgba(201, 168, 76, 0.1)",
    borderRadius: 999,
    flexDirection: "row",
  },
  pill: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PILL_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: 999,
    backgroundColor: "rgba(201, 168, 76, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  half: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    textAlign: "center",
    color: COLORS.neutral.white,
  },
});
