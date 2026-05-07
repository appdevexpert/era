import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { verticalScale } from '@/app/utils/responsive'
import AnimatedSelectableCard from '@/app/components/onboarding/AnimatedSelectableCard'
import {
  GoalBuildMuscle,
  GoalGeneralFitness,
  GoalGetStronger,
  GoalLoseFat,
} from '@/assets/icons'
import type { FC } from 'react'
import type { SvgProps } from 'react-native-svg'

interface GoalStepProps {
  value: string | null
  onSelect: (goal: string) => void
}

const GOALS: { key: string; icon: FC<SvgProps> }[] = [
  { key: 'buildMuscle', icon: GoalBuildMuscle },
  { key: 'loseFat', icon: GoalLoseFat },
  { key: 'getStronger', icon: GoalGetStronger },
  { key: 'generalFitness', icon: GoalGeneralFitness },
]

const GoalStep = ({ value, onSelect }: GoalStepProps) => {
  const { t } = useTranslation()

  return (
    <View style={styles.grid}>
      {GOALS.map(({ key, icon: Icon }) => {
        const isSelected = value === key
        return (
          <Pressable key={key} style={styles.cardWrapper} onPress={() => onSelect(key)}>
            <AnimatedSelectableCard
              selected={isSelected}
              style={styles.cardFrame}
              contentStyle={styles.cardContent}
              fill
            >
              <View style={styles.copy}>
                <Text style={styles.title}>
                  {t(`onboarding.steps.goal.options.${key}`)}
                </Text>
                <Text style={styles.description}>
                  {t(`onboarding.steps.goal.options.${key}Desc`)}
                </Text>
              </View>

              <Icon width={28} height={28} />
            </AnimatedSelectableCard>
          </Pressable>
        )
      })}
    </View>
  )
}

export default GoalStep

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: verticalScale(24),
    marginHorizontal: -8,
  },
  cardWrapper: {
    width: '48.5%',
    height: verticalScale(162),
  },
  cardFrame: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  copy: {
    width: '100%',
    gap: 8,
  },
  title: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 22,
    color: COLORS.neutral.white,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 18.2,
    color: COLORS.alpha.white50,
  },
})
