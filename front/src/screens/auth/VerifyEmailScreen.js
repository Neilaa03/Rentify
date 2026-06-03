import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';import { useTranslation } from "react-i18next";

const VerifyEmailScreen = ({ navigation, route }) => {const { t } = useTranslation();
  const [status, setStatus] = useState('idle'); // idle | verifying | verified | failed
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const paramEmail = route?.params?.email || '';

  const queryParams = useMemo(() => {
    if (Platform.OS !== 'web') return { email: '', token: '', verified: '', reason: '' };
    const search = globalThis?.window?.location?.search || '';
    const params = new URLSearchParams(search);
    return {
      email: params.get('email') || '',
      token: params.get('token') || '',
      verified: params.get('verified') || '',
      reason: params.get('reason') || ''
    };
  }, []);

  const email = (route?.params?.email || queryParams.email || paramEmail || '').trim();
  const token = (route?.params?.token || queryParams.token || '').trim();
  const verifiedParam = String(route?.params?.verified || queryParams.verified || '').trim();
  const reasonParam = String(route?.params?.reason || queryParams.reason || '').trim();

  const friendlyReason = (reason) => {
    const r = String(reason || '').toUpperCase();
    if (!r) return 'Verification failed. Please try again.';
    if (r === 'INVALID_TOKEN') return 'This verification link is invalid or has already been used.';
    if (r === 'EXPIRED') return 'This verification link has expired. Please request a new one.';
    if (r === 'NO_TOKEN') return 'No verification link is active for this email. Please request a new one.';
    if (r === 'NOT_FOUND') return "We couldn't find an account for this email.";
    return 'Verification failed. Please request a new verification email.';
  };

  useEffect(() => {
    const run = async () => {
      if (verifiedParam) {
        if (verifiedParam === '1') {
          setStatus('verified');
          setMessage('Your email is verified. You can log in now.');
        } else {
          setStatus('failed');
          setMessage(friendlyReason(reasonParam));
        }
        return;
      }

      if (!email || !token) return;
      setStatus('verifying');
      setMessage('');
      try {
        const url = `${API_ENDPOINTS.AUTH.VERIFY_EMAIL}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus('verified');
          setMessage('Your email is verified. You can log in now.');
        } else {
          setStatus('failed');
          setMessage(friendlyReason(data?.reason));
        }
      } catch (e) {
        setStatus('failed');
        setMessage("Couldn't reach the server.");
      }
    };
    run();
  }, [email, token, verifiedParam, reasonParam]);

  const handleResend = async () => {
    if (!email) {
      setMessage('Enter your email from the login screen to resend the verification link.');
      return;
    }
    setSending(true);
    setMessage('');
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectBase: Platform.OS !== 'web' ? ExpoLinking.createURL('/') : ''
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setMessage(data?.message || 'Verification email sent.');else
      setMessage(data?.error || 'Failed to resend verification email.');
    } catch (e) {
      setMessage("Couldn't reach the server.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {status === 'verified' ? 'Email verified' : 'Verify your email'}
        </Text>
        <Text style={styles.subtitle}>
          {status === 'verified' ?
          'Your account is ready. You can log in now.' :
          email ? `We sent a verification link to ${email}.` : 'We sent a verification link to your email.'}
        </Text>

        {status === 'verifying' &&
        <View style={styles.row}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.statusText}>{t("screens.auth.verifyemailscreen.verifying")}</Text>
          </View>
        }

        {!!(message || status === 'failed') &&
        <Text style={[styles.message, status === 'failed' ? styles.messageError : null]}>
            {message || 'Verification failed. Please request a new verification email.'}
          </Text>
        }

        {status === 'verified' &&
        <TouchableOpacity style={styles.button} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login', params: { email } }] })}>
            <Text style={styles.buttonText}>{t("screens.auth.verifyemailscreen.goToLogin")}</Text>
          </TouchableOpacity>
        }

        {status !== 'verified' ?
        <>
            <TouchableOpacity style={styles.button} onPress={handleResend} disabled={sending}>
              <Text style={styles.buttonText}>{sending ? 'Sending…' : 'Resend verification email'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => {
              // Note: there is no universal cross-platform deep link to "open inbox".
              // Try Gmail first, then fallback to the default mail handler.
              Linking.openURL('googlegmail://').catch(() => Linking.openURL('mailto:'));
            }}>
            
              <Text style={styles.buttonText}>{t("screens.auth.verifyemailscreen.openEmailApp")}</Text>
            </TouchableOpacity>
          </> :
        null}
      </View>
    </SafeAreaView>);

};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1228', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statusText: { color: 'rgba(255,255,255,0.8)' },
  message: { color: 'rgba(255,255,255,0.9)', marginTop: 8, marginBottom: 12 },
  messageError: { color: 'rgba(255, 92, 92, 0.95)' },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  link: { marginTop: 14, alignSelf: 'center' },
  linkText: { color: COLORS.secondary, fontWeight: '700' }
});

export default VerifyEmailScreen;
