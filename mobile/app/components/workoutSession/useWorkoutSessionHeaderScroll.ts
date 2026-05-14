import { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";

export const WORKOUT_SESSION_HEADER_EXPANDED_HEIGHT = 174;
export const WORKOUT_SESSION_HEADER_COLLAPSE_DISTANCE = 72;

export const useWorkoutSessionHeaderScroll = () => {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = Math.max(event.contentOffset.y, 0);
    },
  });

  return {
    scrollY,
    scrollHandler,
    scrollEventThrottle: 16,
  };
};
