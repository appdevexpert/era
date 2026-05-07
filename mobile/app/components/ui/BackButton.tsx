import { GlassView } from 'expo-glass-effect'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { ChevronBack } from '@/assets/icons'

interface BackButtonProps {
  onPress?: () => void
}

const BackButton = ({ onPress }: BackButtonProps) => {
  const navigation = useNavigation()

  const handlePress = () => {
    if (onPress) {
      onPress()
    } else {
      navigation.goBack()
    }
  }

  return (
    <Pressable onPress={handlePress}>
      <LinearGradient
        colors={['rgba(201, 168, 76, 0.2)', 'rgba(247, 224, 111, 0.2)', 'rgba(252, 243, 192, 0.2)']}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0, y: 0.5 }}
        style={styles.button}
      >
        <GlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          colorScheme="dark"
          style={styles.glass}
        />
        <ChevronBack width={20} height={20} />
      </LinearGradient>
    </Pressable>
  )
}

export default BackButton

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})
