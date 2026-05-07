import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { COLORS, GRADIENTS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'
import {
  FrictionClock,
  FrictionInjury,
  FrictionQuestion,
  FrictionRadioUnselected,
  FrictionStructure,
} from '@/assets/icons'
import type { FC } from 'react'
import type { SvgProps } from 'react-native-svg'

interface FrictionStepProps {
  value: string | null
  onSelect: (friction: string) => void
}

const FRICTIONS = [
  { key: 'structure', icon: FrictionStructure },
  { key: 'time', icon: FrictionClock },
  { key: 'guidance', icon: FrictionQuestion },
  { key: 'injuries', icon: FrictionInjury },
] as const satisfies readonly { key: string; icon: FC<SvgProps> }[]

const SELECT_ANIMATION = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
} as const

type FrictionKey = (typeof FRICTIONS)[number]['key']

interface FrictionOptionProps {
  optionKey: FrictionKey
  icon: FC<SvgProps>
  selected: boolean
  onPress: () => void
}

const FrictionOption = ({
  optionKey,
  icon: Icon,
  selected,
  onPress,
}: FrictionOptionProps) => {
  const { t } = useTranslation()
  const selectedProgress = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, SELECT_ANIMATION)
  }, [selected, selectedProgress])

  const selectedBorderStyle = useAnimatedStyle(() => ({
    opacity: selectedProgress.value,
  }))

  const selectedFillStyle = useAnimatedStyle(() => ({
    opacity: selectedProgress.value,
  }))

  const optionStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(selectedProgress.value, [0, 1], [1, 1.01]),
      },
    ],
  }))

  const selectedDotStyle = useAnimatedStyle(() => ({
    opacity: selectedProgress.value,
    transform: [
      {
        scale: interpolate(selectedProgress.value, [0, 1], [0.45, 1]),
      },
    ],
  }))

  return (
    <Pressable onPress={onPress} style={styles.optionPressable}>
      <Animated.View style={[styles.optionFrame, optionStyle]}>
        <Animated.View pointerEvents="none" style={[styles.selectedBorderLayer, selectedBorderStyle]}>
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 1, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.selectedBorderGradient}
          />
        </Animated.View>

        <View style={styles.optionInner}>
          <Animated.View pointerEvents="none" style={[styles.selectedFillLayer, selectedFillStyle]}>
            <LinearGradient
              colors={[
                'rgba(201, 168, 76, 0.12)',
                'rgba(247, 224, 111, 0.05)',
                'rgba(252, 243, 192, 0.02)',
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.selectedFillGradient}
            />
          </Animated.View>

          <View style={styles.optionContent}>
            <View style={styles.optionLabelGroup}>
              <Icon width={24} height={24} />
              <Text style={styles.optionLabel}>
                {t(`onboarding.steps.friction.options.${optionKey}`)}
              </Text>
            </View>

            <View style={styles.radioStack}>
              <FrictionRadioUnselected width={20} height={20} />
              <Animated.View style={[styles.radioDot, selectedDotStyle]}>
                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 1, y: 1 }}
                  end={{ x: 0, y: 0 }}
                  style={styles.radioDotGradient}
                />
              </Animated.View>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  )
}

const FrictionStep = ({ value, onSelect }: FrictionStepProps) => (
  <View style={styles.container}>
    {FRICTIONS.map(({ key, icon }) => (
      <FrictionOption
        key={key}
        optionKey={key}
        icon={icon}
        selected={value === key}
        onPress={() => onSelect(key)}
      />
    ))}
  </View>
)

export default FrictionStep

const styles = StyleSheet.create({
  container: {
    gap: verticalScale(18),
    marginTop: verticalScale(24),
    marginHorizontal: horizontalScale(-8),
  },
  optionPressable: {
    borderRadius: 16,
  },
  optionFrame: {
    minHeight: verticalScale(74),
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.charcoal,
  },
  selectedBorderLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedBorderGradient: {
    flex: 1,
    borderRadius: 16,
  },
  optionInner: {
    flex: 1,
    margin: 1,
    borderRadius: 15,
    backgroundColor: COLORS.neutral.black3,
    overflow: 'hidden',
  },
  selectedFillLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedFillGradient: {
    flex: 1,
  },
  optionContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  optionLabelGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionLabel: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 22,
    color: COLORS.neutral.white,
  },
  radioStack: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  radioDotGradient: {
    flex: 1,
    borderRadius: 5,
  },
})
