import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { verticalScale } from '@/app/utils/responsive'
import {
  FemaleGender as Female,
  HumanFemale,
  HumanMale,
  MaleGender as Male,
} from '@/assets/icons'

interface GenderStepProps {
  value: string | null
  onSelect: (gender: string) => void
}

const GenderStep = ({ value, onSelect }: GenderStepProps) => {
  const { t } = useTranslation()

  return (
    <>
      {/* Human Illustration */}
      <View style={styles.illustrationContainer}>
        {value === 'female' ? (
          <HumanFemale width={173} height={319} />
        ) : (
          <HumanMale width={184} height={320} />
        )}
      </View>

      {/* Gender Cards */}
      <View style={styles.cardsRow}>
        {(['male', 'female'] as const).map((gender) => {
          const isSelected = value === gender
          const Icon = gender === 'male' ? Male : Female
          const card = (
            <View style={styles.cardInner}>
              {isSelected && (
                <LinearGradient
                  colors={SELECTED_FILL_COLORS}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.selectedFill}
                />
              )}
              <Text style={styles.genderLabel}>
                {t(`onboarding.steps.gender.${gender}`)}
              </Text>
              <Icon width={24} height={24} />
            </View>
          )

          return (
            <Pressable
              key={gender}
              style={styles.cardWrapper}
              onPress={() => onSelect(gender)}
            >
              {isSelected ? (
                <LinearGradient
                  colors={[COLORS.primary.dark, COLORS.primary.base, COLORS.primary.light]}
                  start={{ x: 1, y: 1 }}
                  end={{ x: 0, y: 0 }}
                  style={styles.gradientBorder}
                >
                  {card}
                </LinearGradient>
              ) : (
                <View style={styles.solidBorder}>
                  {card}
                </View>
              )}
            </Pressable>
          )
        })}
      </View>
    </>
  )
}

export default GenderStep

const SELECTED_FILL_COLORS = [
  'rgba(201, 168, 76, 0.12)',
  'rgba(247, 224, 111, 0.05)',
  'rgba(252, 243, 192, 0.02)',
] as const

const styles = StyleSheet.create({
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 20,
    marginHorizontal: -8,
    marginBottom: verticalScale(24),
  },
  cardWrapper: {
    flex: 1,
    height: 136,
  },
  gradientBorder: {
    flex: 1,
    borderRadius: 16,
    padding: 1,
  },
  solidBorder: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  cardInner: {
    flex: 1,
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  selectedFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
  },
  genderLabel: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 20,
    color: COLORS.neutral.white,
  },
})
