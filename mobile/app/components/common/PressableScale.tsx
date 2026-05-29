import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  /** Press-in scale target (default 0.96). */
  pressedScale?: number;
  /** Press-in opacity target (default 0.85). */
  pressedOpacity?: number;
}

const PressableScale = ({
  pressedScale = 0.96,
  pressedOpacity = 0.80,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: PressableScaleProps) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.value = withTiming(pressedScale, { duration: 100 });
        opacity.value = withTiming(pressedOpacity, { duration: 100 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 150 });
        opacity.value = withTiming(1, { duration: 150 });
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    />
  );
};

export default PressableScale;
