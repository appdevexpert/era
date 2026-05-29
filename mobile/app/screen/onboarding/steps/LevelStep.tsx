import { StyleSheet, Text, View } from 'react-native'
import PressableScale from '@/app/components/common/PressableScale'
import { useTranslation } from 'react-i18next'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import AnimatedSelectableCard from '@/app/components/common/AnimatedSelectableCard'
import { IconFlag, IconBolt, IconDumbbell } from '@/assets/icons'
import type { FC } from 'react'
import type { SvgProps } from 'react-native-svg'

interface LevelStepProps {
  value: string | null
  onSelect: (level: string) => void
}

const LEVELS: { key: string; icon: FC<SvgProps> }[] = [
  { key: 'beginner', icon: IconFlag },
  { key: 'intermediate', icon: IconBolt },
  { key: 'advanced', icon: IconDumbbell },
]

const LevelStep = ({ value, onSelect }: LevelStepProps) => {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      {LEVELS.map(({ key, icon: Icon }) => {
        const isSelected = value === key

        return (
          <PressableScale key={key} onPress={() => onSelect(key)}>
            <AnimatedSelectableCard selected={isSelected} contentStyle={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Icon width={24} height={24} />
                <Text style={styles.cardTitle}>
                  {t(`onboarding.steps.level.options.${key}`)}
                </Text>
              </View>
              <Text style={styles.cardDesc}>
                {t(`onboarding.steps.level.options.${key}Desc`)}
              </Text>
            </AnimatedSelectableCard>
          </PressableScale>
        )
      })}
    </View>
  )
}

export default LevelStep

const styles = StyleSheet.create({
  container: {
    gap: 20,
    marginTop: 16,
    marginHorizontal: -8,
  },
  cardContent: {
    padding: 20,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 18,
    color: COLORS.neutral.white,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 19.6,
    color: COLORS.alpha.white50,
  },
})
