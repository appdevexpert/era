import { useNavigation } from '@react-navigation/native'
import IconButton from '@/app/components/common/IconButton'
import { ChevronBack } from '@/assets/icons'

interface BackButtonProps {
  onPress?: () => void
  disabled?: boolean
}

const BackButton = ({ onPress, disabled }: BackButtonProps) => {
  const navigation = useNavigation()

  const handlePress = () => {
    if (onPress) {
      onPress()
    } else {
      navigation.goBack()
    }
  }

  return (
    <IconButton
      onPress={handlePress}
      disabled={disabled}
      size={32}
      glassEffect="clear"
      scheme="light"
      tint="regular"
    >
      <ChevronBack width={20} height={20} />
    </IconButton>
  )
}

export default BackButton
