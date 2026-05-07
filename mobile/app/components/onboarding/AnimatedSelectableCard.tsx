import { ReactNode, useEffect } from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { COLORS, GRADIENTS } from '@/app/constants/colors'

interface AnimatedSelectableCardProps {
  selected: boolean
  children: ReactNode
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  fill?: boolean
}

const SELECT_ANIMATION = {
  duration: 240,
  easing: Easing.out(Easing.cubic),
} as const

const SELECTED_FILL_COLORS = [
  'rgba(201, 168, 76, 0.12)',
  'rgba(247, 224, 111, 0.05)',
  'rgba(252, 243, 192, 0.02)',
] as const

const AnimatedSelectableCard = ({
  selected,
  children,
  style,
  contentStyle,
  fill = false,
}: AnimatedSelectableCardProps) => {
  const selectedProgress = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, SELECT_ANIMATION)
  }, [selected, selectedProgress])

  const selectedLayerStyle = useAnimatedStyle(() => ({
    opacity: selectedProgress.value,
  }))

  const frameStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(selectedProgress.value, [0, 1], [1, 1.01]),
      },
    ],
  }))

  return (
    <Animated.View style={[styles.frame, fill && styles.fill, style, frameStyle]}>
      <Animated.View pointerEvents="none" style={[styles.selectedLayer, selectedLayerStyle]}>
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.borderGradient}
        />
      </Animated.View>

      <View style={[styles.inner, fill && styles.fill]}>
        <Animated.View pointerEvents="none" style={[styles.selectedLayer, selectedLayerStyle]}>
          <LinearGradient
            colors={SELECTED_FILL_COLORS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.fillGradient}
          />
        </Animated.View>

        <View style={[fill && styles.fill, contentStyle]}>
          {children}
        </View>
      </View>
    </Animated.View>
  )
}

export default AnimatedSelectableCard

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  frame: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.charcoal,
  },
  selectedLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  borderGradient: {
    flex: 1,
    borderRadius: 16,
  },
  inner: {
    margin: 1,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.black3,
  },
  fillGradient: {
    flex: 1,
  },
})
