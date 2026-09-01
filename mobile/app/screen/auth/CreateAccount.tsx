import { ReactNode, useEffect, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import PressableScale from '@/app/components/common/PressableScale'
import { Feather } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import {
  EmailAddressIcon,
  PasswordLockIcon,
  UserProfileIcon,
} from '@/assets/icons'
import { signUp, EMAIL_REGEX } from '@/app/utils/auth'
import { AuthStackParamList } from '@/app/navigation/types'
import GradientBackground from '@/app/components/common/GradientBackground'
import PrimaryButton from '@/app/components/common/PrimaryButton'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'

type CreateAccountProps = NativeStackScreenProps<AuthStackParamList, 'CreateAccount'>

type AuthInputProps = {
  icon: ReactNode
  placeholder: string
  value: string
  onChangeText: (value: string) => void
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address'
  rightAccessory?: ReactNode
}

const AuthInput = ({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  rightAccessory,
}: AuthInputProps) => (
  <View style={styles.inputWrap}>
    {icon}
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(240, 240, 240, 0.6)"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      autoCorrect={false}
      style={styles.input}
    />
    {rightAccessory}
  </View>
)

const CreateAccount = ({ navigation }: CreateAccountProps) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordHidden, setPasswordHidden] = useState(true)
  const [confirmPasswordHidden, setConfirmPasswordHidden] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const clearValidation = () => setValidationError(null)

  const handleCreateAccount = async () => {
    // Same as ForgotPassword: drop the keyboard the moment the CTA is
    // pressed, so the focused field is released and any validation error
    // or result is visible without the user dismissing it themselves.
    Keyboard.dismiss()
    setValidationError(null)

    if (!name.trim()) {
      setValidationError(t('auth.errors.nameRequired'))
      return
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setValidationError(t('auth.errors.invalidEmail'))
      return
    }
    if (password.length < 6) {
      setValidationError(t('auth.errors.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setValidationError(t('auth.errors.passwordsDoNotMatch'))
      return
    }

    setIsLoading(true)
    const { error } = await signUp(email.trim(), password, name.trim())
    setIsLoading(false)
    if (error) {
      Toast.show({ type: 'error', text2: error.message, visibilityTime: 3000 })
      return
    }
    Toast.show({ type: 'success', text2: t('auth.accountCreated'), visibilityTime: 3000 })
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        // "padding" on BOTH platforms. RN measures its own frame against the
        // keyboard's screenY, so it self-corrects: if the window resized it
        // computes ~0 and adds nothing, and if it did not (edge-to-edge on
        // Android 15 no longer honours adjustResize) it pads by the real
        // overlap. Leaving Android undefined assumed a resize that never came.
        behavior="padding"
        // GradientBackground wraps this in a SafeAreaView, so the view starts
        // insets.top down the screen while keyboardY is a screen coordinate —
        // without this the computed padding is short by the status bar and the
        // CTA stays tucked under the keys.
        keyboardVerticalOffset={insets.top}
        style={styles.screen}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
         // keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.createAccount')}</Text>
            <Text style={styles.description}>{t('auth.createAccountDescription')}</Text>
          </View>

          <View style={styles.form}>
            <AuthInput
              icon={<UserProfileIcon width={24} height={24} />}
              placeholder={t('auth.name')}
              value={name}
              onChangeText={(v) => { setName(v); clearValidation() }}
            />
            <AuthInput
              icon={<EmailAddressIcon width={24} height={24} />}
              placeholder={t('auth.emailAddress')}
              value={email}
              onChangeText={(v) => { setEmail(v); clearValidation() }}
              keyboardType="email-address"
            />
            <AuthInput
              icon={<PasswordLockIcon width={24} height={24} />}
              placeholder={t('auth.password')}
              value={password}
              onChangeText={(v) => { setPassword(v); clearValidation() }}
              secureTextEntry={passwordHidden}
              rightAccessory={(
                <PressableScale
                  hitSlop={12}
                  onPress={() => setPasswordHidden((prev) => !prev)}
                  style={styles.eyeButton}
                >
                  <Feather
                    name={passwordHidden ? 'eye-off' : 'eye'}
                    size={22}
                    color={COLORS.primary.dark}
                  />
                </PressableScale>
              )}
            />
            <AuthInput
              icon={<PasswordLockIcon width={24} height={24} />}
              placeholder={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); clearValidation() }}
              secureTextEntry={confirmPasswordHidden}
              rightAccessory={(
                <PressableScale
                  hitSlop={12}
                  onPress={() => setConfirmPasswordHidden((prev) => !prev)}
                  style={styles.eyeButton}
                >
                  <Feather
                    name={confirmPasswordHidden ? 'eye-off' : 'eye'}
                    size={22}
                    color={COLORS.primary.dark}
                  />
                </PressableScale>
              )}
            />
          </View>

          {validationError && (
            <Text style={styles.errorText}>{validationError}</Text>
          )}
        </ScrollView>

        {/* Pinned, NOT inside the scroller. Shrinking the scroll viewport (all
            KeyboardAvoidingView does) only makes the form scrollable — the CTA
            was the last item in it, so it stayed below the fold and never rose
            above the keyboard. As a sibling it sits at the bottom of the
            avoiding view, which is exactly the edge that gets lifted. */}
        <View style={styles.actions}>
          <PrimaryButton label={t('auth.createAccount')} onPress={handleCreateAccount} loading={isLoading} />

          <Text style={styles.loginText}>
            {t('auth.alreadyHaveAccountPrefix')}{' '}
            <Text
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              {t('auth.login')}
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  )
}

export default CreateAccount

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: horizontalScale(24),
    paddingBottom: verticalScale(42),
  },
  header: {
    marginTop: verticalScale(40),
  },
  title: {
    fontFamily: FONTS.display,
    fontWeight: '500',
    fontSize: 32,
    color: COLORS.neutral.white,
  },
  description: {
    marginTop: verticalScale(8),
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.alpha.white50,
  },
  form: {
    gap: verticalScale(24),
    marginTop: verticalScale(55),
  },
  inputWrap: {
    height: 53,
    borderRadius: 138.122,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: horizontalScale(16),
    overflow: 'hidden',
    paddingHorizontal: 20.626,
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 24,
    paddingVertical: 0,
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 20,
    color: COLORS.neutral.white,
    textAlignVertical: 'center',
  },
  eyeButton: {
    marginRight: horizontalScale(-2),
  },
  errorText: {
    marginTop: verticalScale(16),
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.semantic.danger,
    textAlign: 'center',
  },
  // Footer, so it carries the gutters the scroll content used to give it.
  actions: {
    gap: Platform.OS === 'ios' ? verticalScale(14) : verticalScale(8),
    paddingHorizontal: horizontalScale(24),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(14),
  },
  loginText: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 16,
    color: 'rgba(240, 240, 240, 0.6)',
    textAlign: 'center',
  },
  loginLink: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    color: COLORS.primary.dark,
  },
})
