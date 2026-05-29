import { type FC, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import PressableScale from '@/app/components/common/PressableScale'
import { useTranslation } from 'react-i18next'
import { GlassView } from 'expo-glass-effect'
import { LinearGradient } from 'expo-linear-gradient'
import type { SvgProps } from 'react-native-svg'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'
import {
  FocusChipSelected,
  FocusChipUnselected,
  MuscleAbsHighlight,
  MuscleBackBase,
  MuscleBackHighlight,
  MuscleBicepsHighlight,
  MuscleCalvesHighlight,
  MuscleChestHighlight,
  MuscleFemaleAbsHighlight,
  MuscleFemaleBackBase,
  MuscleFemaleBackHighlight,
  MuscleFemaleBicepsHighlight,
  MuscleFemaleCalvesHighlight,
  MuscleFemaleChestHighlight,
  MuscleFemaleForearmsHighlight,
  MuscleFemaleFrontBase,
  MuscleFemaleGlutesHighlight,
  MuscleFemaleHamstringsHighlight,
  MuscleFemaleNeckHighlight,
  MuscleFemaleQuadsHighlight,
  MuscleFemaleShouldersHighlight,
  MuscleFemaleTrapsHighlight,
  MuscleFemaleTricepsHighlight,
  MuscleForearmsHighlight,
  MuscleFrontBase,
  MuscleGlutesHighlight,
  MuscleHamstringsHighlight,
  MuscleNeckHighlight,
  MuscleQuadsHighlight,
  MuscleShouldersHighlight,
  MuscleTrapsHighlight,
  MuscleTricepsHighlight,
} from '@/assets/icons'

interface AdvancedFocusStepProps {
  gender: string | null
  value: string[]
  onToggle: (focus: string) => void
}

const FRONT_FOCUS_AREAS = [
  'shoulders',
  'biceps',
  'chest',
  'forearms',
  'neck',
  'quads',
  'abs',
] as const

const BACK_FOCUS_AREAS = [
  'back',
  'triceps',
  'traps',
  'forearms',
  'glutes',
  'hamstrings',
  'calves',
] as const

const FOCUS_AREAS_BY_SIDE = {
  front: FRONT_FOCUS_AREAS,
  back: BACK_FOCUS_AREAS,
} as const

const SEGMENT_SELECTED_COLORS = [
  'rgba(201, 168, 76, 0.3)',
  'rgba(241, 203, 48, 0.3)',
] as const

const CHIP_ANIMATION = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
} as const

type FrontFocusArea = (typeof FRONT_FOCUS_AREAS)[number]
type BackFocusArea = (typeof BACK_FOCUS_AREAS)[number]
type FocusArea = FrontFocusArea | BackFocusArea
type BodySide = 'front' | 'back'
type BodyGender = 'male' | 'female'
type MuscleHighlightMap = Partial<Record<FocusArea, FC<SvgProps>>>

interface MuscleBodyAssetSet {
  frontBase: FC<SvgProps>
  backBase: FC<SvgProps>
  frontHighlights: MuscleHighlightMap
  backHighlights: MuscleHighlightMap
}

const MALE_FRONT_HIGHLIGHTS: MuscleHighlightMap = {
  shoulders: MuscleShouldersHighlight,
  biceps: MuscleBicepsHighlight,
  chest: MuscleChestHighlight,
  forearms: MuscleForearmsHighlight,
  neck: MuscleNeckHighlight,
  quads: MuscleQuadsHighlight,
  abs: MuscleAbsHighlight,
}

const MALE_BACK_HIGHLIGHTS: MuscleHighlightMap = {
  back: MuscleBackHighlight,
  triceps: MuscleTricepsHighlight,
  traps: MuscleTrapsHighlight,
  forearms: MuscleForearmsHighlight,
  glutes: MuscleGlutesHighlight,
  hamstrings: MuscleHamstringsHighlight,
  calves: MuscleCalvesHighlight,
}

const FEMALE_FRONT_HIGHLIGHTS: MuscleHighlightMap = {
  shoulders: MuscleFemaleShouldersHighlight,
  biceps: MuscleFemaleBicepsHighlight,
  chest: MuscleFemaleChestHighlight,
  forearms: MuscleFemaleForearmsHighlight,
  neck: MuscleFemaleNeckHighlight,
  quads: MuscleFemaleQuadsHighlight,
  abs: MuscleFemaleAbsHighlight,
}

const FEMALE_BACK_HIGHLIGHTS: MuscleHighlightMap = {
  back: MuscleFemaleBackHighlight,
  triceps: MuscleFemaleTricepsHighlight,
  traps: MuscleFemaleTrapsHighlight,
  forearms: MuscleFemaleForearmsHighlight,
  glutes: MuscleFemaleGlutesHighlight,
  hamstrings: MuscleFemaleHamstringsHighlight,
  calves: MuscleFemaleCalvesHighlight,
}

const BODY_ASSETS: Record<BodyGender, MuscleBodyAssetSet> = {
  male: {
    frontBase: MuscleFrontBase,
    backBase: MuscleBackBase,
    frontHighlights: MALE_FRONT_HIGHLIGHTS,
    backHighlights: MALE_BACK_HIGHLIGHTS,
  },
  female: {
    frontBase: MuscleFemaleFrontBase,
    backBase: MuscleFemaleBackBase,
    frontHighlights: FEMALE_FRONT_HIGHLIGHTS,
    backHighlights: FEMALE_BACK_HIGHLIGHTS,
  },
}

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

interface MuscleBodyLayerProps {
  gender: BodyGender
  side: BodySide
  selectedAreas: string[]
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
    <PressableScale onPress={onPress} style={styles.chipPressable}>
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
    </PressableScale>
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
    <PressableScale onPress={onPress} style={styles.segment}>
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
    </PressableScale>
  )
}

const HIGHLIGHT_ANIMATION = {
  duration: 500,
  easing: Easing.out(Easing.cubic),
} as const

interface AnimatedHighlightProps {
  Highlight: FC<SvgProps>
  selected: boolean
}

const AnimatedHighlight = ({ Highlight, selected }: AnimatedHighlightProps) => {
  const opacity = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    opacity.value = withTiming(selected ? 1 : 0, HIGHLIGHT_ANIMATION)
  }, [selected, opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View pointerEvents="none" style={[styles.muscleOverlay, animatedStyle]}>
      <Highlight
        width={horizontalScale(184)}
        height={verticalScale(320)}
        preserveAspectRatio="xMidYMid meet"
      />
    </Animated.View>
  )
}

const MuscleBodyLayer = ({ gender, side, selectedAreas }: MuscleBodyLayerProps) => {
  const bodyAssets = BODY_ASSETS[gender]
  const BaseBody = side === 'front' ? bodyAssets.frontBase : bodyAssets.backBase
  const highlights = side === 'front' ? bodyAssets.frontHighlights : bodyAssets.backHighlights

  return (
    <View style={styles.muscleBody}>
      <BaseBody
        width={horizontalScale(184)}
        height={verticalScale(320)}
        preserveAspectRatio="xMidYMid meet"
      />
      {FOCUS_AREAS_BY_SIDE[side].map((focus) => {
        const Highlight = highlights[focus]
        if (!Highlight) return null

        return (
          <AnimatedHighlight
            key={focus}
            Highlight={Highlight}
            selected={selectedAreas.includes(focus)}
          />
        )
      })}
    </View>
  )
}

const AdvancedFocusStep = ({ gender, value, onToggle }: AdvancedFocusStepProps) => {
  const [bodySide, setBodySide] = useState<BodySide>('front')
  const bodyGender: BodyGender = gender === 'female' ? 'female' : 'male'
  const bodySideProgress = useSharedValue(0)

  useEffect(() => {
    bodySideProgress.value = withTiming(bodySide === 'back' ? 1 : 0, {
      duration: 540,
      // Smooth symmetric ease-in-out — gentle accel, fast middle, soft settle.
      easing: Easing.bezier(0.65, 0, 0.35, 1),
    })
  }, [bodySide, bodySideProgress])

  // 3D card-flip rotation with perspective — replaces the flat scaleX flip
  // so the body genuinely "turns around" instead of mirror-snapping.
  const bodyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 2000 },
      {
        rotateY: `${interpolate(bodySideProgress.value, [0, 1], [0, 180])}deg`,
      },
      {
        scale: interpolate(bodySideProgress.value, [0, 0.5, 1], [1, 0.92, 1]),
      },
    ],
  }))

  // Wider crossfade window so the front/back hand-off feels continuous —
  // both layers blend briefly at the midpoint instead of snapping.
  const frontBodyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bodySideProgress.value, [0.4, 0.55], [1, 0], Extrapolation.CLAMP),
  }))

  const backBodyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bodySideProgress.value, [0.45, 0.6], [0, 1], Extrapolation.CLAMP),
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
          {FOCUS_AREAS_BY_SIDE[bodySide].map((focus) => (
            <MuscleChip
              key={focus}
              focus={focus}
              selected={value.includes(focus)}
              onPress={() => onToggle(focus)}
            />
          ))}
        </View>

        <View style={styles.bodyPreview}>
          <Animated.View style={[styles.bodyFlipStage, bodyAnimatedStyle]}>
            <Animated.View style={[styles.bodyLayer, frontBodyStyle]}>
              <MuscleBodyLayer gender={bodyGender} side="front" selectedAreas={value} />
            </Animated.View>
            <Animated.View style={[styles.bodyLayer, styles.bodyBackLayer, backBodyStyle]}>
              <MuscleBodyLayer gender={bodyGender} side="back" selectedAreas={value} />
            </Animated.View>
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
  bodyFlipStage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleBody: {
    width: horizontalScale(184),
    height: verticalScale(320),
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyBackLayer: {
    // Pre-rotated 180° on the Y axis so the back body face appears
    // upright once the parent rotates to 180° during the flip.
    transform: [{ rotateY: '180deg' }],
  },
})
