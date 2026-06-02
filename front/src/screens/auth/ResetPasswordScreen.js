import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';import { useTranslation } from "react-i18next";

const ResetPasswordScreen = ({ navigation, route }) => {const { t } = useTranslation();
  const queryParams = useMemo(() => {
    if (Platform.OS !== 'web') return { email: '', token: '' };
    const search = globalThis?.window?.location?.search || '';
    const params = new URLSearchParams(search);
    return {
      email: params.get('email') || '',
      token: params.get('token') || ''
    };
  }, []);

  const [email, setEmail] = useState(String(route?.params?.email || queryParams.email || '').trim());
  const [token, setToken] = useState(String(route?.params?.token || queryParams.token || '').trim());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const nextEmail = String(route?.params?.email || queryParams.email || '').trim();
    const nextToken = String(route?.params?.token || queryParams.token || '').trim();
    if (nextEmail) setEmail(nextEmail);
    if (nextToken) setToken(nextToken);
  }, [route?.params?.email, route?.params?.token, queryParams.email, queryParams.token]);

  const friendlyReason = (reason) => {
    const r = String(reason || '').toUpperCase();
    if (!r) return 'Password reset failed. Please request a new reset email.';
    if (r === 'INVALID_TOKEN') return 'This reset link is invalid or has already been used.';
    if (r === 'EXPIRED') return 'This reset link has expired. Please request a new one.';
    if (r === 'NO_TOKEN') return 'No reset link is active for this email. Please request a new one.';
    if (r === 'NOT_FOUND') return "We couldn't find an account for this email.";
    return 'Password reset failed. Please request a new reset email.';
  };

  const submit = async () => {
    setMessage('');
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !token) {
      setError('Missing email or token. Open the reset link from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          token,
          password,
          confirmPassword
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage(data?.message || 'Password reset successful. You can log in now.');
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: 'Login', params: { email: trimmedEmail } }] });
        }, 700);
      } else if (data?.reason) {
        setError(friendlyReason(data.reason));
      } else {
        setError(data?.error || 'Password reset failed.');
      }
    } catch (e) {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{t("screens.auth.resetpasswordscreen.resetPassword")}</Text>
        <Text style={styles.subtitle}>{t("screens.auth.resetpasswordscreen.chooseANewPasswordFor")}{email || 'your account'}.</Text>

        <View style={styles.field}>
          <TextInput
            style={styles.input}
            placeholder={t("screens.auth.resetpasswordscreen.newPassword")}
            placeholderTextColor="rgba(255,255,255,0.55)"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword} />
          
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder={t("screens.auth.resetpasswordscreen.confirmPassword")}
          placeholderTextColor="rgba(255,255,255,0.55)"
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword} />
        

        {!!error && <Text style={styles.messageError}>{error}</Text>}
        {!!message && <Text style={styles.messageOk}>{message}</Text>}

        <TouchableOpacity onPress={submit} disabled={loading} style={{ marginTop: 10 }}>
          <LinearGradient
            colors={[COLORS.secondary, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}>
            
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("screens.auth.resetpasswordscreen.resetPassword")}</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword', { email })} style={styles.link}>
          <Text style={styles.linkText}>{t("screens.auth.resetpasswordscreen.resendResetEmail")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>);

};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1228', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  field: { position: 'relative' },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', backgroundColor: 'rgba(255,255,255,0.06)', paddingRight: 44 },
  eyeButton: { position: 'absolute', right: 10, top: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  button: { borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  messageError: { color: 'rgba(255, 92, 92, 0.95)', marginTop: 10 },
  messageOk: { color: 'rgba(126, 231, 135, 0.95)', marginTop: 10 },
  link: { marginTop: 14, alignSelf: 'center' },
  linkText: { color: COLORS.secondary, fontWeight: '700' }
});

export default ResetPasswordScreen;
