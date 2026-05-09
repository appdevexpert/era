import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import Svg, { Circle } from 'react-native-svg'
import GradientBackground from '@/app/components/layout/GradientBackground'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { PlanGenerationStackParamList } from '@/app/navigation/types'
import { completePlanGeneration } from '@/app/stores/slice/authSlice'
import { loadWorkoutBootstrap } from '@/app/stores/slice/workoutSlice'
import {
  selectHasWorkoutBootstrap,
  selectWorkoutError,
  selectWorkoutStatus,
} from '@/app/stores/selectors/workoutSelectors'
import { useAppDispatch } from '@/app/stores/store'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

type PlanGenerationProps = NativeStackScreenProps<
  PlanGenerationStackParamList,
  'PlanGeneration'
>

const PROGRESS_STEP = 4
const PROGRESS_INTERVAL_MS = 160
const CIRCLE_SIZE = 184
const CIRCLE_STROKE_WIDTH = 10
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE_WIDTH) / 2
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS

const PlanGeneration = (_props: PlanGenerationProps) => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const workoutStatus = useSelector(selectWorkoutStatus)
  const workoutError = useSelector(selectWorkoutError)
  const hasWorkoutBootstrap = useSelector(selectHasWorkoutBootstrap)
  const [progress, setProgress] = useState(0)
  const [completed, setCompleted] = useState(false)

  const isFailed = workoutStatus === 'failed'
  const isReady = completed && hasWorkoutBootstrap
  const progressOffset =
    CIRCLE_CIRCUMFERENCE - (progress / 100) * CIRCLE_CIRCUMFERENCE

  useEffect(() => {
    if (!hasWorkoutBootstrap && workoutStatus === 'idle') {
      dispatch(loadWorkoutBootstrap())
    }
  }, [dispatch, hasWorkoutBootstrap, workoutStatus])

  useEffect(() => {
    if (completed || isFailed) return

    const timer = setInterval(() => {
      setProgress((currentProgress) => {
        const nextProgress = Math.min(currentProgress + PROGRESS_STEP, 100)

        if (nextProgress === 100) {
          setCompleted(true)
        }

        return nextProgress
      })
    }, PROGRESS_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [completed, isFailed])

  useEffect(() => {
    if (isReady) {
      dispatch(completePlanGeneration())
    }
  }, [dispatch, isReady])

  const handleRetry = () => {
    setProgress(0)
    setCompleted(false)
    dispatch(loadWorkoutBootstrap())
  }

  return (
    <GradientBackground>
      <View style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>{t('planGeneration.eyebrow')}</Text>
          <Text style={styles.heading}>{t('planGeneration.heading')}</Text>
          <Text style={styles.description}>{t('planGeneration.description')}</Text>

          <View style={styles.progressBlock}>
            <View style={styles.progressCircle}>
              <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                <Circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={CIRCLE_RADIUS}
                  stroke={COLORS.alpha.white08}
                  strokeWidth={CIRCLE_STROKE_WIDTH}
                  fill="transparent"
                />
                <Circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={CIRCLE_RADIUS}
                  stroke={COLORS.primary.base}
                  strokeWidth={CIRCLE_STROKE_WIDTH}
                  strokeDasharray={`${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                />
              </Svg>
              <Text style={styles.progressValue}>{progress}%</Text>
            </View>

            {isFailed ? (
              <Pressable onPress={handleRetry} style={styles.retryButton}>
                <Text style={styles.retryText}>{t('planGeneration.actions.retry')}</Text>
              </Pressable>
            ) : null}

            {isFailed && workoutError ? (
              <Text style={styles.errorText}>{workoutError}</Text>
            ) : null}
          </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: verticalScale(24),
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 12,
    letterSpacing: 0.48,
    textAlign: 'center',
    textTransform: 'uppercase',
    color: COLORS.primary.dark,
  },
  heading: {
    marginTop: verticalScale(10),
    fontFamily: FONTS.display,
    fontWeight: '500',
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
    color: COLORS.neutral.white,
  },
  description: {
    marginTop: verticalScale(12),
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: COLORS.alpha.white72,
  },
  progressBlock: {
    alignItems: 'center',
    marginTop: verticalScale(50),
  },
  progressCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressValue: {
    position: 'absolute',
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 40,
    lineHeight: 46,
    textAlign: 'center',
    color: COLORS.neutral.white,
  },
  retryButton: {
    minHeight: 42,
    marginTop: verticalScale(24),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: COLORS.alpha.primary16,
  },
  retryText: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 14,
    color: COLORS.primary.base,
  },
  errorText: {
    marginTop: verticalScale(10),
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: COLORS.semantic.danger,
  },
})
