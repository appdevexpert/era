import { ReactNode, useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'
import GradientBackground from '@/app/components/layout/GradientBackground'
import BackButton from '@/app/components/ui/BackButton'
import PrimaryButton from '@/app/components/ui/PrimaryButton'

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

interface OnboardingLayoutProps {
  currentStep: number
  totalSteps: number
  eyebrow: string
  heading: string
  description: string
  children: ReactNode
  buttonLabel?: string
  buttonDisabled?: boolean
  showHeader?: boolean
  showButton?: boolean
  direction?: 'forward' | 'back'
  onNext: () => void
  onBack?: () => void
}

const OnboardingLayout = ({
  currentStep,
  totalSteps,
  eyebrow,
  heading,
  description,
  children,
  buttonLabel,
  buttonDisabled = false,
  showHeader = true,
  showButton = true,
  direction = 'forward',
  onNext,
  onBack,
}: OnboardingLayoutProps) => {
  const { t } = useTranslation()
  const progress = currentStep / totalSteps
  const progressValue = useSharedValue(progress)
  const progressTrackWidth = useSharedValue(0)

  useEffect(() => {
    progressValue.value = withTiming(progress, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    })
  }, [progress, progressValue])

  const progressFillAnimatedStyle = useAnimatedStyle(() => ({
    width: progressTrackWidth.value * progressValue.value,
  }))

  return (
    <GradientBackground>
      <View style={styles.screen}>
        {/* Nav Header */}
        <View style={styles.navHeader}>
          <BackButton onPress={onBack} />

          <View
            style={styles.progressBarContainer}
            onLayout={({ nativeEvent }) => {
              progressTrackWidth.value = nativeEvent.layout.width
            }}
          >
            <View style={styles.progressBarTrack} />
            <AnimatedLinearGradient
              colors={[COLORS.primary.dark, COLORS.primary.base, COLORS.primary.light]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.progressBarFill, progressFillAnimatedStyle]}
            />
          </View>

          <Text style={styles.stepCounter}>{currentStep}/{totalSteps}</Text>
        </View>

        <Animated.View
          key={currentStep}
          entering={
            (direction === 'forward' ? FadeInRight : FadeInLeft)
              .duration(300)
              .damping(20)
              .stiffness(150)
          }
          style={{ flex: 1 }}
        >
          {showHeader && (
            <View style={styles.headerSection}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.heading}>{heading}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          )}

          {/* Step Content */}
          <View style={styles.content}>{children}</View>
        </Animated.View>

        {showButton && (
          <View style={styles.buttonContainer}>
            <PrimaryButton
              label={buttonLabel ?? t('onboarding.actions.next')}
              onPress={onNext}
              disabled={buttonDisabled}
            />
          </View>
        )}
      </View>
    </GradientBackground>
  )
}

export default OnboardingLayout

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: horizontalScale(24),
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: horizontalScale(24),
    marginTop: verticalScale(8),
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    position: 'relative',
  },
  progressBarTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 100,
    backgroundColor: COLORS.alpha.white08,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 100,
  },
  stepCounter: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 15,
    color: COLORS.neutral.white,
    textAlign: 'center',
    width: 32,
  },
  headerSection: {
    marginTop: verticalScale(24),
    gap: 8,
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.48,
    textTransform: 'uppercase',
    color: COLORS.primary.dark,
  },
  heading: {
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight:  500,
    color: COLORS.neutral.white,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 24,
    color: COLORS.alpha.white50,
  },
  content: {
    flex: 1,
  },
  buttonContainer: {
    marginBottom: verticalScale(16),
  },
})
