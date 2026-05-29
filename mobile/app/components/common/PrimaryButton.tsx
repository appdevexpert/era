import { LinearGradient } from 'expo-linear-gradient'
import { ActivityIndicator, StyleSheet, Text } from 'react-native'
import GlassFill from '@/app/components/common/GlassFill'
import PressableScale from '@/app/components/common/PressableScale'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'

interface PrimaryButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
}

const PrimaryButton = ({ label, onPress, disabled = false, loading = false }: PrimaryButtonProps) => {
  return (
    <PressableScale onPress={onPress} disabled={disabled || loading}>
      <LinearGradient
        colors={
          disabled || loading
            ? ['rgba(201, 168, 76, 0.3)', 'rgba(247, 224, 111, 0.3)', 'rgba(252, 243, 192, 0.3)']
            : ['#FCF3C0', '#F7E06F', '#C9A84C']
        }
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0, y: 0.5 }}
        style={styles.button}
      >
        <GlassFill />
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.neutral.white} />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </PressableScale>
  )
}

export default PrimaryButton

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 138,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 18,
    letterSpacing: 0.36,
    color: COLORS.neutral.white,
    textAlign: 'center',
  },
})
