import { StyleSheet, Text, View } from 'react-native'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'

const RevenueCatPaywallStep = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paywall</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
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
