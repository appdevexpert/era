import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { SvgProps } from 'react-native-svg'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { verticalScale } from '@/app/utils/responsive'
import AnimatedSelectableCard from '@/app/components/common/AnimatedSelectableCard'
import {
  FocusMuscleAbs,
  FocusMuscleArm,
  FocusMuscleChest,
  FocusMuscleLeg,
  FocusMuscleLowerBody,
  FocusMuscleShoulders,
} from '@/assets/icons'
import type { FC } from 'react'

interface FocusStepProps {
  value: string | null
  onSelect: (focus: string) => void
}

type FocusBadgeKey =
  | 'shoulders'
  | 'chest'
  | 'abs'
  | 'arm'
  | 'lowerBody'
  | 'leg'

const FOCUS_BADGES: Record<
  FocusBadgeKey,
  {
    Icon: FC<SvgProps>
  }
> = {
  shoulders: {
    Icon: FocusMuscleShoulders,
  },
  chest: {
    Icon: FocusMuscleChest,
  },
  abs: {
    Icon: FocusMuscleAbs,
  },
  arm: {
    Icon: FocusMuscleArm,
  },
  lowerBody: {
    Icon: FocusMuscleLowerBody,
  },
  leg: {
    Icon: FocusMuscleLeg,
  },
}

const FOCUS_OPTIONS: { key: string; icons: FocusBadgeKey[] }[] = [
  { key: 'upperBody', icons: ['shoulders', 'chest', 'abs', 'arm'] },
  { key: 'lowerBody', icons: ['leg', 'lowerBody'] },
  { key: 'fullBody', icons: ['shoulders', 'chest', 'abs', 'arm', 'leg', 'lowerBody'] },
]

interface FocusBadgeProps {
  icon: FocusBadgeKey
}

const FocusBadge = ({ icon }: FocusBadgeProps) => {
  const { Icon } = FOCUS_BADGES[icon]

  return <Icon width={44} height={44} />
}

const FocusStep = ({ value, onSelect }: FocusStepProps) => {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      {FOCUS_OPTIONS.map(({ key, icons }) => {
        const isSelected = value === key
        return (
          <Pressable key={key} style={styles.cardWrapper} onPress={() => onSelect(key)}>
            <AnimatedSelectableCard
              selected={isSelected}
              style={styles.cardFrame}
              contentStyle={styles.cardContent}
              fill
            >
              <Text style={styles.title}>
                {t(`onboarding.steps.focus.options.${key}`)}
              </Text>
              <View style={styles.iconRow}>
                {icons.map((icon, index) => {
                  return (
                    <FocusBadge
                      key={`${icon}-${index}`}
                      icon={icon}
                    />
                  )
                })}
              </View>
            </AnimatedSelectableCard>
          </Pressable>
        )
      })}
    </View>
  )
}

export default FocusStep

const styles = StyleSheet.create({
  container: {
    gap: 20,
    marginTop: verticalScale(28),
    marginHorizontal: -8,
  },
  cardWrapper: {
    height: 122,
  },
  cardFrame: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    padding: 19,
    gap: 16,
  },
  title: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 22,
    color: COLORS.neutral.white,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 6.963,
  },
})
