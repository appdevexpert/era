import { useEffect, useMemo, useState } from 'react'
import type { ComponentProps } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import GradientBackground from '@/app/components/layout/GradientBackground'
import PrimaryButton from '@/app/components/ui/PrimaryButton'
import { COLORS, GRADIENTS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { PlanGenerationStackParamList } from '@/app/navigation/types'
import { completePlanGeneration } from '@/app/stores/slice/authSlice'
import { RootState, useAppDispatch } from '@/app/stores/store'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

type PlanGenerationProps = NativeStackScreenProps<
  PlanGenerationStackParamList,
  'PlanGeneration'
>

type FeatherIconName = ComponentProps<typeof Feather>['name']

const GENERATION_STEPS: {
  key: string
  icon: FeatherIconName
  threshold: number
}[] = [
  { key: 'profile', icon: 'user-check', threshold: 24 },
  { key: 'training', icon: 'activity', threshold: 48 },
  { key: 'schedule', icon: 'calendar', threshold: 72 },
  { key: 'finish', icon: 'check-circle', threshold: 100 },
]

const SUMMARY_ICONS: FeatherIconName[] = ['target', 'bar-chart-2', 'crosshair', 'trending-up']

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const PlanGeneration = (_props: PlanGenerationProps) => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const goalData = useSelector((state: RootState) => state.onboarding.goalData)
  const [progress, setProgress] = useState(0)
  const [completed, setCompleted] = useState(false)
  const pulse = useSharedValue(0)
  const sweep = useSharedValue(0)

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    )
    sweep.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false,
    )
  }, [pulse, sweep])

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((currentProgress) => {
        const nextProgress = Math.min(currentProgress + 4, 100)

        if (nextProgress === 100) {
          setCompleted(true)
          clearInterval(timer)
        }

        return nextProgress
      })
    }, 160)

    return () => clearInterval(timer)
  }, [])

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.18, 0.38]),
    transform: [
      {
        scale: interpolate(pulse.value, [0, 1], [0.92, 1.08]),
      },
    ],
  }))

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(sweep.value, [0, 1], [-120, 120]),
      },
    ],
  }))

  const summaryItems = useMemo(() => {
    const goal = isText(goalData.goal)
      ? t(`onboarding.steps.goal.options.${goalData.goal}`)
      : t('planGeneration.fallback.notSet')

    const level = isText(goalData.level)
      ? t(`onboarding.steps.level.options.${goalData.level}`)
      : t('planGeneration.fallback.notSet')

    const focusData = goalData.focus
    const focus = Array.isArray(focusData)
      ? focusData.length > 0
        ? focusData
          .slice(0, 2)
          .map((focusKey) => t(`onboarding.steps.advancedFocus.options.${focusKey}`))
          .join(', ')
        : t('planGeneration.fallback.notSet')
      : isText(focusData)
        ? t(`onboarding.steps.focus.options.${focusData}`)
        : t('planGeneration.fallback.notSet')

    const weight = typeof goalData.weight === 'number' ? Math.round(goalData.weight) : 65
    const weightUnit = isText(goalData.weightUnit) ? goalData.weightUnit : 'kg'
    const height = typeof goalData.height === 'number' ? Math.round(goalData.height) : 180
    const heightUnit = isText(goalData.heightUnit) ? goalData.heightUnit : 'cm'

    return [
      { key: 'goal', label: t('planGeneration.summary.goal'), value: goal },
      { key: 'level', label: t('planGeneration.summary.level'), value: level },
      { key: 'focus', label: t('planGeneration.summary.focus'), value: focus },
      {
        key: 'metrics',
        label: t('planGeneration.summary.metrics'),
        value: `${weight} ${weightUnit} / ${height} ${heightUnit}`,
      },
    ]
  }, [goalData, t])

  const activeStepIndex = Math.min(
    GENERATION_STEPS.length - 1,
    Math.floor(progress / (100 / GENERATION_STEPS.length)),
  )

  const handleContinue = () => {
    if (!completed) return
    dispatch(completePlanGeneration())
  }

  return (
    <GradientBackground>
      <View style={styles.screen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{t('planGeneration.eyebrow')}</Text>
            <Text style={styles.heading}>{t('planGeneration.heading')}</Text>
            <Text style={styles.description}>{t('planGeneration.description')}</Text>
          </View>

          <View style={styles.meterSection}>
            <Animated.View pointerEvents="none" style={[styles.pulseRing, pulseStyle]} />

            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.meterDisc}
            >
              <Feather
                name={completed ? 'check' : 'zap'}
                size={32}
                color={COLORS.neutral.black2}
              />
            </LinearGradient>

            <Text style={styles.progressValue}>{progress}%</Text>
            <Text style={styles.progressLabel}>
              {completed
                ? t('planGeneration.status.ready')
                : t('planGeneration.status.generating')}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
            <Animated.View pointerEvents="none" style={[styles.progressSweep, sweepStyle]} />
          </View>

          <View style={styles.summaryGrid}>
            {summaryItems.map((item, index) => (
              <View key={item.key} style={styles.summaryItem}>
                <View style={styles.summaryIconWrap}>
                  <Feather
                    name={SUMMARY_ICONS[index]}
                    size={18}
                    color={COLORS.primary.base}
                  />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text numberOfLines={2} style={styles.summaryValue}>
                    {item.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.stepList}>
            {GENERATION_STEPS.map((step, index) => {
              const isDone = progress >= step.threshold
              const isActive = !isDone && index === activeStepIndex

              return (
                <View
                  key={step.key}
                  style={[
                    styles.stepRow,
                    isActive && styles.stepRowActive,
                    isDone && styles.stepRowDone,
                  ]}
                >
                  <View style={[styles.stepIcon, isDone && styles.stepIconDone]}>
                    <Feather
                      name={isDone ? 'check' : step.icon}
                      size={18}
                      color={isDone ? COLORS.neutral.black2 : COLORS.primary.dark}
                    />
                  </View>
                  <View style={styles.stepCopy}>
                    <Text style={styles.stepTitle}>
                      {t(`planGeneration.steps.${step.key}.title`)}
                    </Text>
                    <Text style={styles.stepDescription}>
                      {t(`planGeneration.steps.${step.key}.description`)}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <PrimaryButton
            label={completed ? t('planGeneration.actions.ready') : t('planGeneration.actions.generating')}
            onPress={handleContinue}
            disabled={!completed}
          />
        </View>
      </View>
    </GradientBackground>
  )
}

export default PlanGeneration

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: horizontalScale(24),
  },
  scrollContent: {
    paddingTop: verticalScale(32),
    paddingBottom: verticalScale(24),
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 12,
    letterSpacing: 0.48,
    textTransform: 'uppercase',
    color: COLORS.primary.dark,
  },
  heading: {
    fontFamily: FONTS.display,
    fontWeight: '500',
    fontSize: 32,
    lineHeight: 38,
    color: COLORS.neutral.white,
  },
  description: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.alpha.white50,
  },
  meterSection: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(206),
    marginTop: verticalScale(22),
  },
  pulseRing: {
    position: 'absolute',
    width: horizontalScale(154),
    height: horizontalScale(154),
    borderRadius: horizontalScale(77),
    borderWidth: 1,
    borderColor: COLORS.primary.base,
    backgroundColor: COLORS.alpha.primary16,
  },
  meterDisc: {
    width: horizontalScale(82),
    height: horizontalScale(82),
    borderRadius: horizontalScale(41),
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressValue: {
    marginTop: verticalScale(18),
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 34,
    lineHeight: 38,
    color: COLORS.neutral.white,
    textAlign: 'center',
  },
  progressLabel: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.alpha.white72,
    textAlign: 'center',
  },
  progressTrack: {
    height: 8,
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: COLORS.alpha.white08,
  },
  progressFill: {
    height: '100%',
    borderRadius: 100,
  },
  progressSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: horizontalScale(72),
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: verticalScale(24),
  },
  summaryItem: {
    width: '48.4%',
    minHeight: verticalScale(88),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.alpha.white08,
    backgroundColor: COLORS.alpha.surface08,
    padding: 14,
    gap: 10,
  },
  summaryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.alpha.primary16,
  },
  summaryCopy: {
    gap: 3,
  },
  summaryLabel: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 12,
    color: COLORS.alpha.white50,
  },
  summaryValue: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 19,
    color: COLORS.neutral.white,
  },
  stepList: {
    gap: verticalScale(12),
    marginTop: verticalScale(24),
  },
  stepRow: {
    minHeight: verticalScale(72),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.alpha.white08,
    backgroundColor: COLORS.neutral.black3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  stepRowActive: {
    borderColor: COLORS.alpha.primary60,
    backgroundColor: COLORS.alpha.primary16,
  },
  stepRowDone: {
    borderColor: COLORS.alpha.primary20,
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.alpha.primary16,
  },
  stepIconDone: {
    backgroundColor: COLORS.primary.base,
  },
  stepCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  stepTitle: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 20,
    color: COLORS.neutral.white,
  },
  stepDescription: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.alpha.white50,
  },
  buttonContainer: {
    paddingBottom: verticalScale(16),
  },
})
