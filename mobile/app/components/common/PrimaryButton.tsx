import { LinearGradient } from 'expo-linear-gradient'
import { memo } from 'react'
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

// Hoisted to module scope so the gradient's `colors`/`start`/`end` keep a stable
// reference across renders. expo-linear-gradient reference-compares these props
// and re-draws the native gradient whenever they change. Inline literals handed
// it a brand-new array/object on every parent re-render (e.g. every keystroke in
// a form that this button sits in), which showed up as a color flicker.
const GRADIENT_ACTIVE = ['#FCF3C0', '#F7E06F', '#C9A84C'] as const
const GRADIENT_INACTIVE = [
  'rgba(201, 168, 76, 0.3)',
  'rgba(247, 224, 111, 0.3)',
  'rgba(252, 243, 192, 0.3)',
] as const
const GRADIENT_START = { x: 1, y: 0.5 }
const GRADIENT_END = { x: 0, y: 0.5 }

const PrimaryButton = ({ label, onPress, disabled = false, loading = false }: PrimaryButtonProps) => {
  return (
    <PressableScale onPress={onPress} disabled={disabled || loading}>
      <LinearGradient
        colors={disabled || loading ? GRADIENT_INACTIVE : GRADIENT_ACTIVE}
        start={GRADIENT_START}
        end={GRADIENT_END}
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

export default memo(PrimaryButton)

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
