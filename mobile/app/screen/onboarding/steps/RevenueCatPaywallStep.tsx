import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'

const RevenueCatPaywallStep = () => {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('onboarding.steps.paywall.placeholderTitle')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.steps.paywall.placeholderSubtitle')}</Text>
    </View>
  )
}

export default RevenueCatPaywallStep

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.display,
    fontWeight: '500',
    fontSize: 32,
    color: COLORS.neutral.white,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 16,
    color: COLORS.alpha.white50,
    textAlign: 'center',
  },
})
