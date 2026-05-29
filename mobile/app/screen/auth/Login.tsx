import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import PressableScale from '@/app/components/common/PressableScale'
import { Feather, FontAwesome } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import Toast from 'react-native-toast-message'
import { EmailAddressIcon, GoogleLogo, PasswordLockIcon } from '@/assets/icons'
import { EMAIL_REGEX } from '@/app/utils/auth'
import { useAppleAuth } from '@/app/utils/useAppleAuth'
import { useGoogleAuth } from '@/app/utils/useGoogleAuth'
import { signInThunk, clearError } from '@/app/stores/slice/authSlice'
import { selectAuthLoading, selectAuthError } from '@/app/stores/selectors/authSelectors'
import { useAppDispatch } from '@/app/stores/store'
import { AuthStackParamList } from '@/app/navigation/types'
import GradientBackground from '@/app/components/common/GradientBackground'
import PrimaryButton from '@/app/components/common/PrimaryButton'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'

type LoginProps = NativeStackScreenProps<AuthStackParamList, 'Login'>

const Login = ({ navigation }: LoginProps) => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const { loginWithGoogle } = useGoogleAuth()
  const { loginWithApple } = useAppleAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordHidden, setPasswordHidden] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)

  const loadingStatus = useSelector(selectAuthLoading)
  const authError = useSelector(selectAuthError)
  const isLoading = loadingStatus === 'loading'

  useEffect(() => {
    if (authError) {
      Toast.show({ type: 'error', text2: authError, visibilityTime: 3000 })
    }
  }, [authError])

  useEffect(() => {
    dispatch(clearError())
    return () => { dispatch(clearError()) }
  }, [dispatch])

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setValidationError(null)
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setValidationError(null)
  }

  const handleLogin = () => {
    dispatch(clearError())
    setValidationError(null)

    if (!EMAIL_REGEX.test(email.trim())) {
      setValidationError(t('auth.errors.invalidEmail'))
      return
    }
    if (password.length < 6) {
      setValidationError(t('auth.errors.passwordTooShort'))
      return
    }

    dispatch(signInThunk({ email: email.trim(), password })).unwrap().catch(() => {})
  }

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle()
    if (result.type === 'error') {
      Toast.show({ type: 'error', text2: result.error?.message ?? t('auth.errors.invalidEmail'), visibilityTime: 3000 })
    }
  }

  const handleAppleLogin = async () => {
    const result = await loginWithApple()
    if (result.type === 'error') {
      Toast.show({ type: 'error', text2: result.error?.message ?? t('auth.errors.invalidEmail'), visibilityTime: 3000 })
    }
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.login')}</Text>
          <Text style={styles.description}>{t('auth.loginDescription')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <EmailAddressIcon width={24} height={24} />
            <TextInput
              value={email}
              onChangeText={handleEmailChange}
              placeholder={t('auth.emailAddress')}
              placeholderTextColor="rgba(240, 240, 240, 0.6)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrap}>
            <PasswordLockIcon width={24} height={24} />
            <TextInput
              value={password}
              onChangeText={handlePasswordChange}
              placeholder={t('auth.password')}
              placeholderTextColor="rgba(240, 240, 240, 0.6)"
              secureTextEntry={passwordHidden}
              autoCapitalize="none"
              style={styles.input}
              
            />
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
          </View>

          <PressableScale
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>{t('auth.forgotPasswordQuestion')}</Text>
          </PressableScale>
        </View>

        {validationError && (
          <Text style={styles.errorText}>{validationError}</Text>
        )}

        <View style={styles.actions}>
          <PrimaryButton label={t('auth.login')} onPress={handleLogin} loading={isLoading} />

          <Text style={styles.signupText}>
            {t('auth.noAccountPrefix')}{' '}
            <Text
              style={styles.signupLink}
              onPress={() => navigation.navigate('CreateAccount')}
            >
              {t('auth.signUp')}
            </Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.divider} />
          <Text style={styles.socialTitle}>{t('auth.orContinueWithAccount')}</Text>

          <View style={styles.socialRow}>
            {Platform.OS === 'ios' && (
              <PressableScale
                onPress={handleAppleLogin}
                style={styles.socialButton}
              >
                <FontAwesome name="apple" size={25} color={COLORS.neutral.white} />
                <Text style={styles.socialText}>{t('auth.apple')}</Text>
              </PressableScale>
            )}

            <PressableScale
              onPress={handleGoogleLogin}
              style={styles.socialButton}
            >
              <GoogleLogo width={24} height={24} />
              <Text style={styles.socialText}>{t('auth.google')}</Text>
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  )
}

export default Login

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: horizontalScale(24),
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
    marginTop: verticalScale(38),
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
  forgotButton: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 16,
    color: COLORS.neutral.white,
    textAlign: 'right',
  },
  errorText: {
    marginTop: verticalScale(16),
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.semantic.danger,
    textAlign: 'center',
  },
  actions: {
    gap: verticalScale(24),
    marginTop: verticalScale(34),
  },
  signupText: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 16,
    color: 'rgba(240, 240, 240, 0.6)',
    textAlign: 'center',
  },
  signupLink: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    color: COLORS.primary.dark,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: verticalScale(42),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(240, 240, 240, 0.28)',
  },
  socialTitle: {
    marginTop: verticalScale(42),
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 16,
    color: 'rgba(240, 240, 240, 0.6)',
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    gap: horizontalScale(11),
    marginTop: verticalScale(24),
  },
  socialButton: {
    flex: 1,
    height: 53,
    borderRadius: 138,
    backgroundColor: COLORS.alpha.surface08,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: horizontalScale(12),
  },
  socialText: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 18,
    color: COLORS.neutral.white,
  },
})
