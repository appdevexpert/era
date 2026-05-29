import { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, StyleSheet, Text, View } from 'react-native'
import PressableScale from '@/app/components/common/PressableScale'
import WeightRuler from '@/app/components/workout/WeightRuler'
import { useAnimatedCounter } from '@/app/hooks/useAnimatedCounter'
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { COLORS, GRADIENTS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const IS_SHORT_SCREEN = SCREEN_HEIGHT < 860

// Pre-compute outside worklet to avoid crash
const PILL_OFFSET = horizontalScale(62.5)
const CONTENT_TOP_PADDING = verticalScale(IS_SHORT_SCREEN ? 22 : 34)
const HEIGHT_DISPLAY_TOP_MARGIN = verticalScale(IS_SHORT_SCREEN ? 58 : 84)
const RULER_TOP_MARGIN = verticalScale(IS_SHORT_SCREEN ? 28 : 42)
const BMI_TOP_MARGIN = verticalScale(IS_SHORT_SCREEN ? 24 : 36)

export type HeightUnit = 'cm' | 'ft'

interface HeightStepProps {
  value: number
  unit: HeightUnit
  weight: number
  onChange: (height: number, unit: HeightUnit) => void
}

const UNIT_OPTIONS: HeightUnit[] = ['cm', 'ft']

// Imperial uses 12 inches per foot — step is 1/12 ft so each ruler tick is
// one inch (5'9" → 5'10" → 5'11" → 6'0"), not decimal-feet.
const INCH_STEP = 1 / 12

const UNIT_CONFIG: Record<
  HeightUnit,
  {
    min: number
    max: number
    step: number
    fractionDigits: number
    label: string
    displayLabel: string
  }
> = {
  cm: {
    min: 100,
    max: 250,
    step: 1,
    fractionDigits: 0,
    label: 'Cm',
    displayLabel: 'cm',
  },
  ft: {
    min: 3,
    max: 8,
    step: INCH_STEP,
    fractionDigits: 0, // unused — formatFeetInches handles display
    label: 'Ft.',
    displayLabel: '',
  },
}

/** 5.8333 ft → "5'10"" ; 5 ft → "5'0"" ; rounds to nearest inch. */
const formatFeetInches = (valueFt: number): string => {
  const totalInches = Math.round(valueFt * 12)
  const ft = Math.floor(totalInches / 12)
  const inches = totalInches - ft * 12
  return `${ft}'${inches}"`
}

const SELECT_ANIMATION = {
  duration: 240,
  easing: Easing.out(Easing.cubic),
} as const

const HEALTHY_BMI_COLOR = '#3DCA7A'

const convertHeight = (height: number, fromUnit: HeightUnit, toUnit: HeightUnit) => {
  if (fromUnit === toUnit) return height
  if (fromUnit === 'cm') {
    // cm → ft, rounded to the nearest inch (1/12 ft).
    return Math.round((height / 30.48) * 12) / 12
  }
  return Math.round(height * 30.48)
}

const clampHeight = (height: number, unit: HeightUnit) => {
  const { min, max } = UNIT_CONFIG[unit]
  return Math.min(max, Math.max(min, height))
}

const calculateBMI = (weightKg: number, heightCm: number) => {
  if (heightCm <= 0) return 0
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

const getBMIColor = (bmi: number) => {
  if (bmi < 18.5) return '#F7E06F'
  if (bmi < 25) return HEALTHY_BMI_COLOR
  if (bmi < 30) return '#F7E06F'
  return COLORS.semantic.danger
}

const getBMIMessageKey = (bmi: number) => {
  if (bmi < 18.5) return 'below'
  if (bmi < 25) return 'healthy'
  if (bmi < 30) return 'overweight'
  return 'obese'
}

const GradientHeightText = ({ text }: { text: string }) => {
  const fontSize = 60

  return (
    <Svg height={fontSize + 4} style={styles.svgText}>
      <Defs>
        <SvgGradient id="heightGrad" x1="1" y1="0.5" x2="0" y2="0.5">
          <Stop offset="0" stopColor={GRADIENTS.primary[0]} />
          <Stop offset="0.1964" stopColor={GRADIENTS.primary[1]} />
          <Stop offset="0.8354" stopColor={GRADIENTS.primary[2]} />
        </SvgGradient>
      </Defs>
      <SvgText
        fill="url(#heightGrad)"
        fontSize={fontSize}
        fontWeight="500"
        fontFamily={FONTS.medium}
        x="50%"
        y={fontSize}
        textAnchor="middle"
      >
        {text}
      </SvgText>
    </Svg>
  )
}

const UnitSwitch = ({
  unit,
  onSelect,
}: {
  unit: HeightUnit
  onSelect: (unit: HeightUnit) => void
}) => {
  const selectedProgress = useSharedValue(unit === 'cm' ? 0 : 1)

  useEffect(() => {
    selectedProgress.value = withTiming(unit === 'cm' ? 0 : 1, SELECT_ANIMATION)
  }, [selectedProgress, unit])

  const selectedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: selectedProgress.value * PILL_OFFSET }],
  }))

  return (
    <View style={styles.unitSwitch}>
      <Animated.View style={[styles.unitSelectedPill, selectedPillStyle]} />
      {UNIT_OPTIONS.map((option) => (
        <PressableScale
          key={option}
          style={styles.unitOption}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onSelect(option)
          }}
        >
          <Text style={styles.unitOptionText}>{UNIT_CONFIG[option].label}</Text>
        </PressableScale>
      ))}
    </View>
  )
}

const BMIDisplay = ({ bmi }: { bmi: number }) => {
  const { t } = useTranslation()

  if (bmi <= 0) return null

  return (
    <View style={styles.bmiContainer}>
      <View style={styles.bmiHeader}>
        <Text style={styles.bmiLabel}>{t('onboarding.steps.height.bmi.label')}</Text>
        <Text style={[styles.bmiValue, { color: getBMIColor(bmi) }]}>{bmi.toFixed(1)}</Text>
      </View>
      <Text style={styles.bmiMessage}>
        {t(`onboarding.steps.height.bmi.${getBMIMessageKey(bmi)}`)}
      </Text>
    </View>
  )
}

const HeightStep = ({ value, unit, weight, onChange }: HeightStepProps) => {
  const [displayHeight, setDisplayHeight] = useState(value)
  const hasSentInitialValue = useRef(false)
  const config = UNIT_CONFIG[unit]

  useEffect(() => {
    if (hasSentInitialValue.current) return
    hasSentInitialValue.current = true
    onChange(value, unit)
  }, [onChange, unit, value])

  useEffect(() => {
    setDisplayHeight(value)
  }, [unit, value])

  const rulerKey = useMemo(() => unit, [unit])

  const handleUnitSelect = (nextUnit: HeightUnit) => {
    if (nextUnit === unit) return
    const nextHeight = clampHeight(convertHeight(displayHeight, unit, nextUnit), nextUnit)
    setDisplayHeight(nextHeight)
    onChange(nextHeight, nextUnit)
  }

  const handleRulerChange = (nextValue: number) => {
    // For ft, snap to nearest inch (1/12). For cm, snap to integer.
    const rounded = unit === 'ft'
      ? Math.round(nextValue * 12) / 12
      : Math.round(nextValue)
    if (rounded !== displayHeight) {
      setDisplayHeight(rounded)
      onChange(rounded, unit)
    }
  }

  const heightInCm = unit === 'cm' ? displayHeight : displayHeight * 30.48
  const bmi = calculateBMI(weight, heightInCm)

  // Smoothly tween the displayed height between ruler ticks. For ft, step is
  // 1/12 ft (one inch) — the counter rounds to inch boundaries while still
  // animating fluidly between them.
  const animatedHeight = useAnimatedCounter(displayHeight, {
    step: unit === 'ft' ? 1 / 12 : 1,
    duration: 240,
  })
  // Smooth BMI display — tweens to 0.1 precision so it ticks through 22.3,
  // 22.4, 22.5 instead of snapping.
  const animatedBmi = useAnimatedCounter(bmi, { step: 0.1, duration: 240 })

  const displayText =
    unit === 'ft' ? formatFeetInches(animatedHeight) : String(Math.round(animatedHeight))

  return (
    <View style={styles.container}>
      <UnitSwitch unit={unit} onSelect={handleUnitSelect} />

      <View style={styles.heightDisplay}>
        <GradientHeightText text={displayText} />
        {config.displayLabel ? (
          <Text style={styles.heightUnit}>{config.displayLabel}</Text>
        ) : null}
      </View>

      <View style={styles.rulerContainer}>
        <WeightRuler
          key={rulerKey}
          label=""
          unit=""
          value={displayHeight}
          onValueChange={handleRulerChange}
          min={config.min}
          max={config.max}
          step={config.step}
          headerless
        />
      </View>

      <BMIDisplay bmi={animatedBmi} />
    </View>
  )
}

export default HeightStep

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: CONTENT_TOP_PADDING,
  },
  unitSwitch: {
    width: horizontalScale(125),
    height: verticalScale(32),
    borderRadius: 999,
    backgroundColor: 'rgba(201, 168, 76, 0.10)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  unitSelectedPill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: horizontalScale(65),
    height: verticalScale(32),
    borderRadius: 999,
    backgroundColor: 'rgba(201, 168, 76, 0.80)',
    shadowColor: COLORS.neutral.black,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {
      width: 4,
      height: 0,
    },
  },
  unitOption: {
    width: horizontalScale(62.5),
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitOptionText: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.neutral.white,
  },
  heightDisplay: {
    marginTop: HEIGHT_DISPLAY_TOP_MARGIN,
    alignItems: 'center',
    gap: 6,
  },
  svgText: {
    alignSelf: 'center',
    width: '100%',
  },
  heightUnit: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.alpha.white50,
    textAlign: 'center',
  },
  rulerContainer: {
    marginTop: RULER_TOP_MARGIN,
    marginHorizontal: horizontalScale(-24),
    alignItems: 'center',
  },
  bmiContainer: {
    marginTop: BMI_TOP_MARGIN,
    gap: 6,
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bmiLabel: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 16,
    color: COLORS.neutral.white,
  },
  bmiValue: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 16,
  },
  bmiMessage: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 16.8,
    color: COLORS.alpha.white50,
  },
})
