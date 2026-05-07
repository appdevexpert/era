import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassView } from 'expo-glass-effect'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'
import { FocusChipSelected, FocusChipUnselected, FocusMuscleFront } from '@/assets/icons'

interface AdvancedFocusStepProps {
  value: string[]
  onToggle: (focus: string) => void
}

const FOCUS_AREAS = [
  'shoulders',
  'triceps',
  'biceps',
  'chest',
  'neck',
  'legs',
  'abs',
] as const

const SEGMENT_SELECTED_COLORS = [
  'rgba(201, 168, 76, 0.3)',
  'rgba(241, 203, 48, 0.3)',
] as const

const CHIP_ANIMATION = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
} as const

type FocusArea = (typeof FOCUS_AREAS)[number]
type BodySide = 'front' | 'back'

interface MuscleChipProps {
  focus: FocusArea
  selected: boolean
  onPress: () => void
}

interface BodySegmentProps {
  side: BodySide
  activeSide: BodySide
  onPress: () => void
}

const MuscleChip = ({ focus, selected, onPress }: MuscleChipProps) => {
  const { t } = useTranslation()
  const selectionProgress = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    selectionProgress.value = withTiming(selected ? 1 : 0, CHIP_ANIMATION)
  }, [selected, selectionProgress])

  const selectedLayerStyle = useAnimatedStyle(() => ({
    opacity: selectionProgress.value,
  }))

  const chipContentStyle = useAnimatedStyle(() => ({
    paddingHorizontal: interpolate(selectionProgress.value, [0, 1], [16, 12]),
    transform: [
      {
        scale: interpolate(selectionProgress.value, [0, 1], [1, 1.015]),
      },
    ],
  }))

  const selectedDotStyle = useAnimatedStyle(() => ({
    opacity: selectionProgress.value,
    transform: [
      {
        scale: interpolate(selectionProgress.value, [0, 1], [0.78, 1]),
      },
    ],
  }))

  const unselectedDotStyle = useAnimatedStyle(() => ({
    opacity: 1 - selectionProgress.value,
    transform: [
      {
        scale: interpolate(selectionProgress.value, [0, 1], [1, 0.78]),
      },
    ],
  }))

  return (
    <Pressable onPress={onPress} style={styles.chipPressable}>
      <View style={styles.chipSurface}>
        <GlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          colorScheme="dark"
          style={styles.glassFill}
        />

        <Animated.View pointerEvents="none" style={[styles.selectedChipLayer, selectedLayerStyle]}>
          <LinearGradient
            colors={SEGMENT_SELECTED_COLORS}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.selectedChipGradient}
          >
            <GlassView
              pointerEvents="none"
              glassEffectStyle="regular"
              colorScheme="dark"
              style={styles.glassFill}
            />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.chipContent, chipContentStyle]}>
          <View style={styles.dotStack}>
            <Animated.View style={[styles.dotLayer, unselectedDotStyle]}>
              <FocusChipUnselected width={12} height={12} />
            </Animated.View>
            <Animated.View style={[styles.dotLayer, selectedDotStyle]}>
              <FocusChipSelected width={12} height={12} />
            </Animated.View>
          </View>
          <Text style={styles.chipText}>
            {t(`onboarding.steps.advancedFocus.options.${focus}`)}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  )
}

const BodySegment = ({ side, activeSide, onPress }: BodySegmentProps) => {
  const { t } = useTranslation()
  const selected = activeSide === side
  const selectionProgress = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    selectionProgress.value = withTiming(selected ? 1 : 0, CHIP_ANIMATION)
  }, [selected, selectionProgress])

  const selectedLayerStyle = useAnimatedStyle(() => ({
    opacity: selectionProgress.value,
  }))

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(selectionProgress.value, [0, 1], [1, 1.015]),
      },
    ],
  }))

  return (
    <Pressable onPress={onPress} style={styles.segment}>
      <View style={styles.segmentSurface}>
        <GlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          colorScheme="dark"
          style={styles.glassFill}
        />
        <Animated.View pointerEvents="none" style={[styles.selectedChipLayer, selectedLayerStyle]}>
          <LinearGradient
            colors={SEGMENT_SELECTED_COLORS}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.segmentGradient}
          >
            <GlassView
              pointerEvents="none"
              glassEffectStyle="regular"
              colorScheme="dark"
              style={styles.glassFill}
            />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.segmentContent, contentStyle]}>
          <Text style={styles.segmentText}>
            {t(`onboarding.steps.advancedFocus.tabs.${side}`)}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  )
}

const AdvancedFocusStep = ({ value, onToggle }: AdvancedFocusStepProps) => {
  const [bodySide, setBodySide] = useState<BodySide>('front')
  const bodySideProgress = useSharedValue(0)

  useEffect(() => {
    bodySideProgress.value = withTiming(bodySide === 'back' ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    })
  }, [bodySide, bodySideProgress])

  const bodyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bodySideProgress.value, [0, 0.5, 1], [1, 0.82, 1]),
    transform: [
      {
        scaleX: interpolate(bodySideProgress.value, [0, 1], [1, -1]),
      },
      {
        scale: interpolate(bodySideProgress.value, [0, 0.5, 1], [1, 0.985, 1]),
      },
    ],
  }))

  return (
    <View style={styles.container}>
      <View style={styles.segmentedControl}>
        {(['front', 'back'] as const).map((side) => (
          <BodySegment
            key={side}
            side={side}
            activeSide={bodySide}
            onPress={() => setBodySide(side)}
          />
        ))}
      </View>

      <View style={styles.selectorStage}>
        <View style={styles.chipColumn}>
          {FOCUS_AREAS.map((focus) => (
            <MuscleChip
              key={focus}
              focus={focus}
              selected={value.includes(focus)}
              onPress={() => onToggle(focus)}
            />
          ))}
        </View>

        <View style={styles.bodyPreview}>
          <Animated.View style={bodyAnimatedStyle}>
            <FocusMuscleFront
              width={horizontalScale(184)}
              height={verticalScale(320)}
              preserveAspectRatio="xMidYMid meet"
            />
          </Animated.View>
        </View>
      </View>
    </View>
  )
}

export default AdvancedFocusStep

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: verticalScale(34),
  },
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: horizontalScale(12),
  },
  segment: {
    height: 40,
    borderRadius: 29.867,
    overflow: 'hidden',
    backgroundColor: 'rgba(17, 17, 17, 0.2)',
  },
  segmentGradient: {
    flex: 1,
    borderRadius: 29.867,
  },
  segmentSurface: {
    flex: 1,
    borderRadius: 29.867,
    overflow: 'hidden',
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29.867,
  },
  segmentContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  segmentText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  selectorStage: {
    flex: 1,
    marginTop: verticalScale(38),
    minHeight: verticalScale(350),
  },
  chipColumn: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    gap: verticalScale(13),
  },
  chipPressable: {
    alignSelf: 'flex-start',
    borderRadius: 29.867,
  },
  chipSurface: {
    height: 40,
    borderRadius: 29.867,
    overflow: 'hidden',
    backgroundColor: 'rgba(17, 17, 17, 0.2)',
  },
  selectedChipLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedChipGradient: {
    flex: 1,
    borderRadius: 29.867,
  },
  chipContent: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 29.867,
    paddingVertical: 10,
  },
  dotStack: {
    width: 12,
    height: 12,
  },
  dotLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  chipText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  bodyPreview: {
    position: 'absolute',
    top: verticalScale(18),
    right: horizontalScale(-6),
    width: horizontalScale(184),
    height: verticalScale(320),
    alignItems: 'center',
    justifyContent: 'center',
  },
})
