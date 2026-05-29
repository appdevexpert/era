import { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, StyleSheet, Text, View } from 'react-native'
import PressableScale from '@/app/components/common/PressableScale'
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { COLORS, GRADIENTS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'
import { RulerPicker } from 'react-native-ruler-picker'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Pre-compute outside worklet to avoid crash
const PILL_OFFSET = horizontalScale(62.5)

export type WeightUnit = 'kg' | 'lb'

interface WeightStepProps {
  value: number
  unit: WeightUnit
  onChange: (weight: number, unit: WeightUnit) => void
}

const UNIT_OPTIONS: WeightUnit[] = ['kg', 'lb']

const UNIT_CONFIG: Record<
  WeightUnit,
  {
    min: number
    max: number
    label: string
    displayLabel: string
  }
> = {
  kg: {
    min: 30,
    max: 200,
    label: 'Kgs',
    displayLabel: 'Kgs',
  },
  lb: {
    min: 66,
    max: 440,
    label: 'Lbs',
    displayLabel: 'Lbs',
  },
}

const SELECT_ANIMATION = {
  duration: 240,
  easing: Easing.out(Easing.cubic),
} as const

const convertWeight = (weight: number, fromUnit: WeightUnit, toUnit: WeightUnit) => {
  if (fromUnit === toUnit) return weight
  return Math.round(fromUnit === 'kg' ? weight * 2.20462 : weight / 2.20462)
}

const clampWeight = (weight: number, unit: WeightUnit) => {
  const { min, max } = UNIT_CONFIG[unit]
  return Math.min(max, Math.max(min, weight))
}

const GradientWeightText = ({ value }: { value: number }) => {
  const text = String(value)
  const fontSize = 60

  return (
    <Svg height={fontSize + 4} style={styles.svgText}>
      <Defs>
        <SvgGradient id="weightGrad" x1="1" y1="0.5" x2="0" y2="0.5">
          <Stop offset="0" stopColor={GRADIENTS.primary[0]} />
          <Stop offset="0.1964" stopColor={GRADIENTS.primary[1]} />
          <Stop offset="0.8354" stopColor={GRADIENTS.primary[2]} />
        </SvgGradient>
      </Defs>
      <SvgText
        fill="url(#weightGrad)"
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
  unit: WeightUnit
  onSelect: (unit: WeightUnit) => void
}) => {
  const selectedProgress = useSharedValue(unit === 'kg' ? 0 : 1)

  useEffect(() => {
    selectedProgress.value = withTiming(unit === 'kg' ? 0 : 1, SELECT_ANIMATION)
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

const WeightStep = ({ value, unit, onChange }: WeightStepProps) => {
  const [displayWeight, setDisplayWeight] = useState(value)
  const hasSentInitialValue = useRef(false)
  const config = UNIT_CONFIG[unit]

  useEffect(() => {
    if (hasSentInitialValue.current) return
    hasSentInitialValue.current = true
    onChange(value, unit)
  }, [onChange, unit, value])

  useEffect(() => {
    setDisplayWeight(value)
  }, [unit, value])

  const rulerKey = useMemo(() => unit, [unit])

  const handleUnitSelect = (nextUnit: WeightUnit) => {
    if (nextUnit === unit) return

    const nextWeight = clampWeight(convertWeight(displayWeight, unit, nextUnit), nextUnit)
    setDisplayWeight(nextWeight)
    onChange(nextWeight, nextUnit)
  }

  const handleValueChange = (nextValue: string) => {
    const parsedValue = Number(nextValue)
    if (!Number.isNaN(parsedValue)) {
      const rounded = Math.round(parsedValue)
      if (rounded !== displayWeight) {
        Haptics.selectionAsync()
      }
      setDisplayWeight(rounded)
    }
  }

  const handleValueChangeEnd = (nextValue: string) => {
    const parsedValue = Number(nextValue)
    if (!Number.isNaN(parsedValue)) {
      onChange(Math.round(parsedValue), unit)
    }
  }

  return (
    <View style={styles.container}>
      <UnitSwitch unit={unit} onSelect={handleUnitSelect} />

      <View style={styles.weightDisplay}>
        <GradientWeightText value={displayWeight} />
        <Text style={styles.weightUnit}>{config.displayLabel}</Text>
      </View>

      <View style={styles.rulerContainer}>
        <RulerPicker
          key={rulerKey}
          width={SCREEN_WIDTH}
          height={verticalScale(150)}
          min={config.min}
          max={config.max}
          step={1}
          fractionDigits={0}
          initialValue={value}
          unit=""
          indicatorHeight={verticalScale(94)}
          indicatorColor={COLORS.primary.dark}
          gapBetweenSteps={horizontalScale(14)}
          shortStepHeight={verticalScale(14)}
          longStepHeight={verticalScale(32)}
          stepWidth={2}
          shortStepColor={COLORS.alpha.white12}
          longStepColor={COLORS.neutral.white}
          valueTextStyle={styles.hiddenRulerText}
          unitTextStyle={styles.hiddenRulerText}
          decelerationRate="fast"
          onValueChange={handleValueChange}
          onValueChangeEnd={handleValueChangeEnd}
        />
      </View>
    </View>
  )
}

export default WeightStep

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: verticalScale(34),
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
  weightDisplay: {
    marginTop: verticalScale(84),
    alignItems: 'center',
    gap: 6,
  },
  svgText: {
    alignSelf: 'center',
    width: '100%',
  },
  weightUnit: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.alpha.white50,
    textAlign: 'center',
  },
  rulerContainer: {
    marginTop: verticalScale(42),
    marginHorizontal: horizontalScale(-24),
    alignItems: 'center',
  },
  hiddenRulerText: {
    color: COLORS.alpha.transparent,
    fontSize: 1,
    fontWeight: '400',
  },
})
