import { useEffect, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PressableScale from '@/app/components/common/PressableScale'
import { Feather } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import Toast from 'react-native-toast-message'
import { EmailAddressIcon, PasswordLockIcon } from '@/assets/icons'
import { EMAIL_REGEX, supabase, updatePassword, mapSupabaseUser } from '@/app/utils/auth'
import {
  resetPasswordThunk,
  clearError,
  setRecovery,
  login,
} from '@/app/stores/slice/authSlice'
import { selectAuthLoading, selectAuthError } from '@/app/stores/selectors/authSelectors'
import { useAppDispatch, type RootState } from '@/app/stores/store'
import { AuthStackParamList } from '@/app/navigation/types'
import GradientBackground from '@/app/components/common/GradientBackground'
import BackButton from '@/app/components/common/BackButton'
import PrimaryButton from '@/app/components/common/PrimaryButton'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'

type ForgotPasswordProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>

const ForgotPassword = ({ navigation }: ForgotPasswordProps) => {
  const dispatch = useAppDispatch()
  const insets = useSafeAreaInsets()
  const isRecovery = useSelector((state: RootState) => state.auth.isRecovery)
  const { t } = useTranslation()

  // Mirrors Navigation's old clearRecovery: drop the recovery flag, then
  // promote the active Supabase session (if any) into Redux so the user
  // lands on Home instead of the login screen.
  const clearRecovery = () => {
    dispatch(setRecovery(false))
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        dispatch(login(mapSupabaseUser(session.user)))
      }
    })
  }

  // Email request state
  const [email, setEmail] = useState('')
  const loadingStatus = useSelector(selectAuthLoading)
  const authError = useSelector(selectAuthError)
  const isRequestLoading = loadingStatus === 'loading'
  const [emailSent, setEmailSent] = useState(false)

  // New password state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordHidden, setPasswordHidden] = useState(true)
  const [confirmPasswordHidden, setConfirmPasswordHidden] = useState(true)
  const [isResetLoading, setIsResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // Shared
  const [validationError, setValidationError] = useState<string | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    dispatch(clearError())
    return () => { dispatch(clearError()) }
  }, [dispatch])

  useEffect(() => {
    if (hasSubmitted && authError) {
      Toast.show({ type: 'error', text2: authError, visibilityTime: 3000 })
    }
  }, [hasSubmitted, authError])

  useEffect(() => {
    if (resetError) {
      Toast.show({ type: 'error', text2: resetError, visibilityTime: 3000 })
    }
  }, [resetError])

  useEffect(() => {
    if (hasSubmitted && loadingStatus === 'succeeded' && !emailSent && !isRecovery) {
      setEmailSent(true)
      Toast.show({ type: 'success', text2: t('auth.errors.resetPasswordSuccess'), visibilityTime: 3000 })
    }
  }, [hasSubmitted, loadingStatus, emailSent, isRecovery, t])

  const clearValidation = () => {
    setValidationError(null)
    setResetError(null)
  }

  // --- Email request handler ---
  const handleSendEmail = () => {
    // Drop the keyboard as soon as Continue is pressed so the "check your
    // email" panel and the Back to Login action are visible without the user
    // having to dismiss it themselves.
    Keyboard.dismiss()
    dispatch(clearError())
    setValidationError(null)
    setEmailSent(false)

    if (!EMAIL_REGEX.test(email.trim())) {
      setValidationError(t('auth.errors.invalidEmail'))
      return
    }

    setHasSubmitted(true)
    dispatch(resetPasswordThunk({ email: email.trim() }))
  }

  // --- New password handler ---
  const handleResetPassword = async () => {
    // Release the focused field so the result — or a validation error — is
    // visible without the user dismissing the keyboard themselves.
    Keyboard.dismiss()
    setValidationError(null)
    setResetError(null)

    if (password.length < 6) {
      setValidationError(t('auth.errors.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setValidationError(t('auth.errors.passwordsDoNotMatch'))
      return
    }

    setIsResetLoading(true)
    const { error } = await updatePassword(password)
    setIsResetLoading(false)

    if (error) {
      setResetError(error.message)
      return
    }

    clearRecovery()
    Toast.show({
      type: 'success',
      text2: t('auth.passwordResetSuccess'),
      visibilityTime: 3000,
    })
  }

  // --- Recovery mode: new password form ---
  if (isRecovery) {
    return (
      <GradientBackground>
        <KeyboardAvoidingView
          // "padding" on both platforms: RN measures its own frame against the
          // keyboard, so it adds nothing when the window already resized and
          // pads by the real overlap when it did not (edge-to-edge on Android
          // 15 no longer honours adjustResize).
          behavior="padding"
          keyboardVerticalOffset={insets.top}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.navHeader}>
              <BackButton onPress={() => { clearRecovery(); navigation.navigate('Login') }} />
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>{t('auth.resetPassword')}</Text>
              <Text style={styles.description}>{t('auth.resetPasswordDescription')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <PasswordLockIcon width={24} height={24} />
                <TextInput
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearValidation() }}
                  placeholder={t('auth.newPassword')}
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

              <View style={styles.inputWrap}>
                <PasswordLockIcon width={24} height={24} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); clearValidation() }}
                  placeholder={t('auth.confirmNewPassword')}
                  placeholderTextColor="rgba(240, 240, 240, 0.6)"
                  secureTextEntry={confirmPasswordHidden}
                  autoCapitalize="none"
                  style={styles.input}
                />
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
              </View>
            </View>

            {validationError && (
              <Text style={styles.errorText}>{validationError}</Text>
            )}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <PrimaryButton
              label={t('auth.resetPasswordButton')}
              onPress={handleResetPassword}
              loading={isResetLoading}
            />
          </View>
        </KeyboardAvoidingView>
      </GradientBackground>
    )
  }

  // --- Default mode: email request form ---
  return (
    <GradientBackground>
      <KeyboardAvoidingView
        // "padding" on both platforms: RN measures its own frame against the
        // keyboard, so it adds nothing when the window already resized and
        // pads by the real overlap when it did not (edge-to-edge on Android
        // 15 no longer honours adjustResize).
        behavior="padding"
        keyboardVerticalOffset={insets.top}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.navHeader}>
            <BackButton onPress={() => navigation.goBack()} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.forgotPassword')}</Text>
            <Text style={styles.description}>{t('auth.forgotPasswordDescription')}</Text>
          </View>

          <View style={[styles.inputWrap, { marginTop: verticalScale(42) }]}>
            <EmailAddressIcon width={24} height={24} />
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); setValidationError(null); setEmailSent(false) }}
              placeholder={t('auth.emailAddress')}
              placeholderTextColor="rgba(240, 240, 240, 0.6)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          {validationError && (
            <Text style={styles.errorText}>{validationError}</Text>
          )}

          {emailSent && !validationError && (
            <View style={styles.sentPanel}>
              <Text style={styles.sentTitle}>{t('auth.checkYourEmail')}</Text>
              <Text style={styles.sentBody}>
                {t('auth.resetLinkSent', { email: email.trim() })}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <PrimaryButton
            label={emailSent ? t('auth.resendLink') : t('common.continue')}
            onPress={handleSendEmail}
            loading={isRequestLoading}
          />
          <PressableScale
            hitSlop={12}
            onPress={() => navigation.navigate('Login')}
            style={styles.backToLoginButton}
          >
            <Text style={styles.backToLoginText}>{t('auth.backToLogin')}</Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  )
}

export default ForgotPassword

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: horizontalScale(24),
  },
  navHeader: {
    marginTop: verticalScale(8),
    alignItems: 'flex-start',
  },
  header: {
    marginTop: verticalScale(33),
    gap: verticalScale(8),
  },
  title: {
    fontFamily: FONTS.display,
    fontWeight: '500',
    fontSize: 24,
    color: COLORS.neutral.white,
  },
  description: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 19.6,
    color: COLORS.alpha.white50,
  },
  form: {
    gap: verticalScale(24),
    marginTop: verticalScale(42),
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
  sentPanel: {
    marginTop: verticalScale(24),
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  sentTitle: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 15,
    color: COLORS.neutral.white,
  },
  sentBody: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 19.6,
    color: COLORS.alpha.white50,
  },
  backToLoginButton: {
    marginTop: verticalScale(16),
    alignSelf: 'center',
  },
  backToLoginText: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 14,
    color: COLORS.primary.dark,
  },
  errorText: {
    marginTop: verticalScale(16),
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.semantic.danger,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: horizontalScale(24),
    paddingBottom: verticalScale(16),
  },
})
