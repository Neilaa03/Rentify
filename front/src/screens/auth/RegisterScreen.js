import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from
  'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthHeader from '../../components/auth/AuthHeader';
import AuthInputField from '../../components/auth/AuthInputField';
import AuthGradientButton from '../../components/auth/AuthGradientButton';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import { isTablet, moderateScale, rf } from '../../utils/responsive'; import { useTranslation } from "react-i18next";
import { useTheme } from '../../contexts/ThemeContext';

const RegisterScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabletLayout = isTablet();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    confirmPassword: '',
    form: ''
  });

  const clearError = (key) => {
    if (!errors[key]) return;
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleRegister = async () => {
    const nextErrors = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: '',
      password: '',
      confirmPassword: '',
      form: ''
    };

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirstName) nextErrors.firstName = 'Please enter your first name.';
    if (!trimmedLastName) nextErrors.lastName = 'Please enter your last name.';
    if (!trimmedEmail) nextErrors.email = 'Please enter your email.';
    if (!trimmedPhone) nextErrors.phone = 'Please enter your phone number.';
    if (!selectedRole) nextErrors.role = 'Please select a role.';
    if (!password) nextErrors.password = 'Please create a password.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.';
    if (password && password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    if (password && confirmPassword && password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords don't match.";
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setErrors({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: '',
      password: '',
      confirmPassword: '',
      form: ''
    });

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail,
          phone: trimmedPhone,
          password,
          confirmPassword,
          role: selectedRole,
          redirectBase: Platform.OS !== 'web' ? Linking.createURL('/') : ''
        })
      });

      const data = await response.json();

      if (response.ok) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'VerifyEmail', params: { email: trimmedEmail } }]
        });
        return;
      }

      const message = data?.error || "We couldn't create your account. Please try again.";
      const lower = String(message).toLowerCase();

      if (lower.includes('email')) setErrors((prev) => ({ ...prev, email: message })); else
        if (lower.includes('phone')) setErrors((prev) => ({ ...prev, phone: message })); else
          if (lower.includes('password')) setErrors((prev) => ({ ...prev, password: message })); else
            setErrors((prev) => ({ ...prev, form: message }));
    } catch (error) {
      console.error('Fetch error:', error);
      setErrors((prev) => ({
        ...prev,
        form: "We couldn't reach the server. Please try again."
      }));
    }
  };

  const roles = [
    { id: 'client', label: t("screens.auth.registerscreen.client"), icon: 'person' },
    { id: 'owner', label: t("screens.auth.registerscreen.vehicleOwner"), icon: 'car' },
    { id: 'companyManager', label: t("screens.auth.registerscreen.agency"), icon: 'business' }];


  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/background.png')}
        style={styles.background}
        resizeMode="cover">

        <SafeAreaView style={styles.overlay}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoid}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">

              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={28} color={colors.white} />
              </TouchableOpacity>

              <View style={styles.header}>
                <AuthHeader
                  title={t("screens.auth.registerscreen.createAccount")}
                  subtitle={t("screens.auth.registerscreen.joinRentifyAndStartYourJourney")} />

              </View>

              <View
                style={[
                  styles.form,
                  {
                    maxWidth: tabletLayout ? 620 : '100%',
                    alignSelf: 'center'
                  }]
                }>

                <View style={styles.nameRow}>
                  <View style={[styles.inputContainer, styles.halfInput, styles.halfInputLeft]}>
                    <AuthInputField
                      label={t("screens.auth.registerscreen.firstName")}
                      error={errors.firstName}
                      inputStyle={[
                        styles.input,
                        {
                          backgroundColor: 'rgba(255,255,255,0.16)',
                          borderColor: 'rgba(255,255,255,0.3)',
                          color: colors.white,
                        },
                        firstName.trim() ? styles.inputFilled : null,
                        errors.firstName ? styles.inputError : null,
                      ]}
                      placeholderTextColor="rgba(255,255,255,0.72)"
                      placeholder={t("screens.auth.registerscreen.john")}
                      value={firstName}
                      onChangeText={(text) => {
                        setFirstName(text);
                        clearError('firstName');
                        clearError('form');
                      }}
                      autoCapitalize="words" />

                  </View>

                  <View style={[styles.inputContainer, styles.halfInput, styles.halfInputRight]}>
                    <AuthInputField
                      label={t("screens.auth.registerscreen.lastName")}
                      error={errors.lastName}
                      inputStyle={[
                        styles.input,
                        {
                          backgroundColor: 'rgba(255,255,255,0.16)',
                          borderColor: 'rgba(255,255,255,0.3)',
                          color: colors.white,
                        },
                        lastName.trim() ? styles.inputFilled : null,
                        errors.lastName ? styles.inputError : null,
                      ]}
                      placeholderTextColor="rgba(255,255,255,0.72)"
                      placeholder={t("screens.auth.registerscreen.doe")}
                      value={lastName}
                      onChangeText={(text) => {
                        setLastName(text);
                        clearError('lastName');
                        clearError('form');
                      }}
                      autoCapitalize="words" />

                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <AuthInputField
                    label={t("screens.auth.registerscreen.emailAddress")}
                    error={errors.email}
                    inputStyle={[
                      styles.input,
                      {
                        backgroundColor: 'rgba(255,255,255,0.16)',
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: colors.white,
                      },
                      email.trim() ? styles.inputFilled : null,
                      errors.email ? styles.inputError : null,
                    ]}
                    placeholder={t("screens.auth.registerscreen.exampleMailCom")}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      clearError('email');
                      clearError('form');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none" />

                </View>

                <View style={styles.inputContainer}>
                  <AuthInputField
                    label={t("screens.auth.registerscreen.phoneNumber")}
                    error={errors.phone}
                    inputStyle={[
                      styles.input,
                      {
                        backgroundColor: 'rgba(255,255,255,0.16)',
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: colors.white,
                      },
                      phone.trim() ? styles.inputFilled : null,
                      errors.phone ? styles.inputError : null,
                    ]}
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      clearError('phone');
                      clearError('form');
                    }}
                    keyboardType="phone-pad" />

                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.white }]}>{t("screens.auth.registerscreen.selectYourRole")}</Text>
                  <View style={styles.rolesContainer}>
                    {roles.map((role) =>
                      <TouchableOpacity
                        key={role.id}
                        style={[
                          styles.roleButton,
                          selectedRole === role.id && styles.roleButtonActive
                        ]
                        }
                        onPress={() => {
                          setSelectedRole(role.id);
                          clearError('role');
                          clearError('form');
                        }}>

                        <View
                          style={[
                            styles.roleIconContainer,
                            selectedRole === role.id && styles.roleIconContainerActive]
                          }>

                          <Ionicons
                            name={role.icon}
                            size={moderateScale(26)}
                            color={selectedRole === role.id ? colors.white : 'rgba(255,255,255,0.75)'} />

                        </View>
                        <Text
                          style={[
                            styles.roleLabel,
                            {
                              color: selectedRole === role.id
                                ? colors.white
                                : 'rgba(255,255,255,0.75)',
                            },
                            selectedRole === role.id && {
                              fontWeight: '700',
                            },
                          ]}>

                          {role.label}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {!!errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.white }]}>{t("screens.auth.registerscreen.password")}</Text>
                  <View>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.3)', color: colors.white },
                        password ? styles.inputFilled : null,
                        errors.password ? styles.inputError : null]
                      }
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.72)"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        clearError('password');
                        clearError('form');
                      }}
                      secureTextEntry={!showPassword} />

                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      style={styles.eyeButton}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>

                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={colors.textMuted} />

                    </TouchableOpacity>
                  </View>
                  {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.white }]}>{t("screens.auth.registerscreen.confirmPassword")}</Text>
                  <View>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.3)', color: colors.white },
                        confirmPassword ? styles.inputFilled : null,
                        errors.confirmPassword ? styles.inputError : null]
                      }
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.72)"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        clearError('confirmPassword');
                        clearError('form');
                      }}
                      secureTextEntry={!showConfirmPassword} />

                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((v) => !v)}
                      style={styles.eyeButton}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'
                      }>

                      <Ionicons
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={colors.textMuted} />

                    </TouchableOpacity>
                  </View>
                  {!!errors.confirmPassword &&
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  }
                  {!!errors.form && <Text style={styles.errorText}>{errors.form}</Text>}
                </View>

                <View style={styles.registerButtonContainer}>
                  <AuthGradientButton label={t("screens.auth.registerscreen.createAccount")} onPress={handleRegister} />
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t("screens.auth.registerscreen.alreadyHaveAnAccount") + "  "}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.linkText}>{t("screens.auth.registerscreen.signIn")}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>);

};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  overlay: {
    flex: 1,
    paddingHorizontal: moderateScale(20),
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  keyboardAvoid: { flex: 1 },
  scrollView: {
    flex: 1,
    paddingVertical: moderateScale(18)
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: moderateScale(24)
  },
  backButton: {
    width: moderateScale(46),
    aspectRatio: 1,
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(18)
  },
  header: { marginBottom: moderateScale(4) },
  form: { width: '100%' },
  nameRow: {
    flexDirection: 'row',
    width: '100%',
    flexWrap: 'wrap'
  },
  halfInput: {
    flexGrow: 1,
    flexBasis: 160
  },
  halfInputLeft: {
    marginRight: moderateScale(6)
  },
  halfInputRight: {
    marginLeft: moderateScale(6)
  },
  inputContainer: { marginBottom: moderateScale(2) },
  label: {
    marginBottom: moderateScale(8),
    fontSize: rf(14, 12, 16),
    fontWeight: '500'
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(13),
    paddingRight: moderateScale(46),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    fontSize: rf(15, 13, 18)
  },
  inputFilled: {
    backgroundColor: 'rgba(230, 215, 255, 0.26)',
    borderColor: 'rgba(166, 110, 255, 0.35)'
  },
  eyeButton: {
    position: 'absolute',
    right: moderateScale(12),
    top: moderateScale(10),
    height: moderateScale(36),
    width: moderateScale(36),
    alignItems: 'center',
    justifyContent: 'center'
  },
  inputError: {
    borderColor: 'rgba(255, 92, 92, 0.9)'
  },
  errorText: {
    marginTop: moderateScale(8),
    color: 'rgba(255, 92, 92, 0.95)',
    fontSize: rf(12, 11, 14),
    lineHeight: rf(16, 14, 20)
  },
  rolesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: moderateScale(8)
  },
  registerButtonContainer: {
    marginTop: moderateScale(18)
  },
  roleButton: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: moderateScale(78),
    maxWidth: 180,
    alignItems: 'center',
    paddingVertical: moderateScale(12),
    marginHorizontal: moderateScale(3),
    marginBottom: moderateScale(8),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  roleButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(166, 110, 255, 0.2)'
  },
  roleIconContainer: {
    width: moderateScale(50),
    aspectRatio: 1,
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(8)
  },
  roleIconContainerActive: {
    backgroundColor: COLORS.primary
  },
  roleLabel: {
    fontSize: rf(12, 11, 14),
    fontWeight: '500',
    textAlign: 'center'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: moderateScale(28),
    marginBottom: moderateScale(16),
    flexWrap: 'wrap'
  },
  footerText: { color: '#aaa' },
  linkText: {
    color: '#985bf0',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  }
});

export default RegisterScreen;
