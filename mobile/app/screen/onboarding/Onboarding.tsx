import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { submitGoalData, updateGoalData } from '@/app/stores/slice/onboardingSlice'
import { useAppDispatch } from '@/app/stores/store'
import type { OnboardingStackParamList } from '@/app/navigation/types'
import OnboardingLayout from '@/app/components/common/OnboardingLayout'
import GenderStep from './steps/GenderStep'
import AgeStep from './steps/AgeStep'
import LevelStep from './steps/LevelStep'
import GoalStep from './steps/GoalStep'
import FocusStep from './steps/FocusStep'
import AdvancedFocusStep from './steps/AdvancedFocusStep'
import FrictionStep from './steps/FrictionStep'
import WeightStep, { type WeightUnit } from './steps/WeightStep'
import HeightStep, { type HeightUnit } from './steps/HeightStep'

const STEPS = ['gender', 'age', 'level', 'goal', 'focus', 'friction', 'weight', 'height'] as const

const TOTAL_STEPS = STEPS.length

interface Selections {
  gender: string | null
  birthYear: number
  level: string | null
  goal: string | null
  focus: string | null
  advancedFocus: string[]
  friction: string | null
  weight: number
  weightUnit: WeightUnit
  height: number
  heightUnit: HeightUnit
}

const Onboarding = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>()
  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [selections, setSelections] = useState<Selections>({
    gender: null,
    birthYear: new Date().getFullYear() - 25,
    level: null,
    goal: null,
    focus: null,
    advancedFocus: [],
    friction: null,
    weight: 65,
    weightUnit: 'kg',
    height: 180,
    heightUnit: 'cm',
  })

  const currentStepKey = STEPS[stepIndex]
  const isAdvancedFocusStep = currentStepKey === 'focus' && selections.level === 'advanced'
  const layoutStepKey = isAdvancedFocusStep ? 'advancedFocus' : currentStepKey
  const currentValue =
    currentStepKey === 'age'
      ? selections.birthYear
      : isAdvancedFocusStep
        ? selections.advancedFocus
        : selections[currentStepKey]
  const buttonDisabled =
    currentStepKey === 'age' ||
    currentStepKey === 'weight' ||
    currentStepKey === 'height'
      ? false
      : Array.isArray(currentValue)
        ? currentValue.length === 0
        : !currentValue

  const handleSelect = (value: string) => {
    if (
      currentStepKey === 'age' ||
      currentStepKey === 'weight' ||
      currentStepKey === 'height'
    ) return

    const nextSelections: Selections = {
      ...selections,
      [currentStepKey]: value,
    }
    const nextGoalData: Record<string, string | string[] | null> = {
      [currentStepKey]: value,
    }

    if (currentStepKey === 'level' && selections.level !== value) {
      nextSelections.focus = null
      nextSelections.advancedFocus = []
      nextGoalData.focus = null
      nextGoalData.advancedFocus = []
    }

    setSelections(nextSelections)
    dispatch(updateGoalData(nextGoalData))
  }

  const handleAdvancedFocusToggle = (focus: string) => {
    const advancedFocus = selections.advancedFocus.includes(focus)
      ? selections.advancedFocus.filter((item) => item !== focus)
      : [...selections.advancedFocus, focus]

    setSelections((prev) => ({
      ...prev,
      advancedFocus,
    }))
    dispatch(updateGoalData({ focus: advancedFocus, advancedFocus }))
  }

  const handleBirthYearChange = useCallback((birthYear: number) => {
    setSelections((prev) => ({ ...prev, birthYear }))
    dispatch(updateGoalData({ birthYear }))
  }, [dispatch])

  const handleWeightChange = useCallback((weight: number, weightUnit: WeightUnit) => {
    setSelections((prev) => ({
      ...prev,
      weight,
      weightUnit,
    }))
    dispatch(updateGoalData({ weight, weightUnit }))
  }, [dispatch])

  const handleHeightChange = useCallback((height: number, heightUnit: HeightUnit) => {
    setSelections((prev) => ({
      ...prev,
      height,
      heightUnit,
    }))
    dispatch(updateGoalData({ height, heightUnit }))
  }, [dispatch])

  const weightInKg = selections.weightUnit === 'kg'
    ? selections.weight
    : selections.weight / 2.20462

  const handleNext = () => {
    if (buttonDisabled) return
    if (stepIndex < STEPS.length - 1) {
      setDirection('forward')
      setStepIndex(stepIndex + 1)
    } else {
      // Last measurement step finished. Push goals to Supabase in the
      // background and route the user to the standalone Paywall screen —
      // PaywallScreen handles the actual completion of onboarding once the
      // user buys or dismisses, so the navigator can switch stacks then.
      void dispatch(submitGoalData())
      navigation.navigate('Paywall', { source: 'onboarding' })
    }
  }

  const handleBack = () => {
    if (stepIndex > 0) {
      setDirection('back')
      setStepIndex(stepIndex - 1)
    }
  }

  return (
    <OnboardingLayout
      currentStep={stepIndex + 1}
      totalSteps={TOTAL_STEPS}
      eyebrow={t(`onboarding.steps.${layoutStepKey}.eyebrow`)}
      heading={t(`onboarding.steps.${layoutStepKey}.heading`)}
      description={t(`onboarding.steps.${layoutStepKey}.description`)}
      buttonDisabled={buttonDisabled}
      direction={direction}
      onNext={handleNext}
      onBack={stepIndex > 0 ? handleBack : undefined}
    >
      {currentStepKey === 'gender' && (
        <GenderStep value={selections.gender} onSelect={handleSelect} />
      )}
      {currentStepKey === 'age' && (
        <AgeStep value={selections.birthYear} onChange={handleBirthYearChange} />
      )}
      {currentStepKey === 'level' && (
        <LevelStep value={selections.level} onSelect={handleSelect} />
      )}
      {currentStepKey === 'goal' && (
        <GoalStep value={selections.goal} onSelect={handleSelect} />
      )}
      {currentStepKey === 'focus' && (
        isAdvancedFocusStep ? (
          <AdvancedFocusStep
            gender={selections.gender}
            value={selections.advancedFocus}
            onToggle={handleAdvancedFocusToggle}
          />
        ) : (
          <FocusStep value={selections.focus} onSelect={handleSelect} />
        )
      )}
      {currentStepKey === 'friction' && (
        <FrictionStep value={selections.friction} onSelect={handleSelect} />
      )}
      {currentStepKey === 'weight' && (
        <WeightStep
          value={selections.weight}
          unit={selections.weightUnit}
          onChange={handleWeightChange}
        />
      )}
      {currentStepKey === 'height' && (
        <HeightStep
          value={selections.height}
          unit={selections.heightUnit}
          weight={weightInKg}
          onChange={handleHeightChange}
        />
      )}
    </OnboardingLayout>
  )
}

export default Onboarding
