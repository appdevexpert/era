import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import Toast from 'react-native-toast-message'
import { EmailAddressIcon, PasswordLockIcon } from '@/assets/icons'
import { EMAIL_REGEX, updatePassword } from '@/app/utils/auth'
import { resetPasswordThunk, clearError } from '@/app/stores/slice/authSlice'
import { selectAuthLoading, selectAuthError } from '@/app/stores/selectors/authSelectors'
import { useAppDispatch } from '@/app/stores/store'
import { useRecovery } from '@/app/navigation/RecoveryContext'
import { AuthStackParamList } from '@/app/navigation/types'
import GradientBackground from '@/app/components/layout/GradientBackground'
import BackButton from '@/app/components/ui/BackButton'
import PrimaryButton from '@/app/components/ui/PrimaryButton'
import { COLORS } from '@/app/constants/colors'
import { FONTS } from '@/app/constants/fonts'
import { horizontalScale, verticalScale } from '@/app/utils/responsive'

type ForgotPasswordProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>

const ForgotPassword = ({ navigation }: ForgotPasswordProps) => {
  const { isRecovery, clearRecovery } = useRecovery()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.screen}
        >
          <View style={styles.navHeader}>
            <BackButton onPress={() => { clearRecovery(); navigation.navigate('Login') }} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.resetPassword')}</Text>
            <Text style={styles.description}>{t('auth.resetPasswordDescription')}</Text>
          </View>

          <>
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
                  <Pressable
                    hitSlop={12}
                    onPress={() => setPasswordHidden((prev) => !prev)}
                    style={styles.eyeButton}
                  >
                    <Feather
                      name={passwordHidden ? 'eye-off' : 'eye'}
                      size={22}
                      color={COLORS.primary.dark}
                    />
                  </Pressable>
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
                  <Pressable
                    hitSlop={12}
                    onPress={() => setConfirmPasswordHidden((prev) => !prev)}
                    style={styles.eyeButton}
                  >
                    <Feather
                      name={confirmPasswordHidden ? 'eye-off' : 'eye'}
                      size={22}
                      color={COLORS.primary.dark}
                    />
                  </Pressable>
                </View>
              </View>

              {validationError && (
                <Text style={styles.errorText}>{validationError}</Text>
              )}

              <View style={styles.buttonContainer}>
                <PrimaryButton
                  label={t('auth.resetPasswordButton')}
                  onPress={handleResetPassword}
                  loading={isResetLoading}
                />
              </View>
            </>
        </KeyboardAvoidingView>
      </GradientBackground>
    )
  }

  // --- Default mode: email request form ---
  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
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

        <View style={styles.buttonContainer}>
          <PrimaryButton label={t('common.continue')} onPress={handleSendEmail} loading={isRequestLoading} />
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  )
}

export default ForgotPassword

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  errorText: {
    marginTop: verticalScale(16),
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    color: COLORS.semantic.danger,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingBottom: verticalScale(16),
  },
})
